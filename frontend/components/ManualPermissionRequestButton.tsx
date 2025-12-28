"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import WorkflowPermissionManager from "./WorkflowPermissionManager";
import { PermissionProvider } from "@/providers/PermissionProvider";
import { analyzeTransferContext } from "@/lib/workflow-executor";
import type { WorkflowNode } from "@/lib/types";
import type { Edge } from "reactflow";
import { toast } from "@/components/ui/use-toast";

interface ManualPermissionRequestButtonProps {
  nodes: WorkflowNode[];
  edges: Edge[];
  smartAccounts: Record<string, string>;
}

export default function ManualPermissionRequestButton({
  nodes,
  edges,
  smartAccounts,
}: ManualPermissionRequestButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  const checkWorkflowReadiness = () => {
    const info: string[] = [];
    
    console.log('=== Workflow Readiness Check ===')
    console.log('Nodes:', nodes)
    console.log('Edges:', edges)
    console.log('Smart Accounts State:', smartAccounts)
    
    // Find required nodes (skip agent-default as it's just a visual representation)
    const erc4337Node = nodes.find(n => n.type === 'erc4337' && n.id !== 'agent-default');
    const transferNode = nodes.find(n => n.type === 'transfer');
    const tokenNode = nodes.find(n => n.type === 'erc20-tokens');
    const nativeTokenNode = nodes.find(n => n.type === 'native-token');

    info.push(`Found nodes:`);
    info.push(`- ERC-4337: ${erc4337Node ? '✓' : '✗'}`);
    info.push(`- Transfer: ${transferNode ? '✓' : '✗'}`);
    info.push(`- ERC-20: ${tokenNode ? '✓' : '✗'}`);
    info.push(`- Native ETH: ${nativeTokenNode ? '✓' : '✗'}`);

    if (!erc4337Node) {
      info.push(`\n⚠️ Missing ERC-4337 node`);
      return { ready: false, info: info.join('\n') };
    }

    if (!transferNode) {
      info.push(`\n⚠️ Missing Transfer node`);
      return { ready: false, info: info.join('\n') };
    }

    if (!tokenNode && !nativeTokenNode) {
      info.push(`\n⚠️ Missing ERC-20 or Native ETH token node`);
      return { ready: false, info: info.join('\n') };
    }

    // Get smart account address - prioritize node data as it's always up to date
    const nodeSmartAccountAddr = (erc4337Node.data as any).smartAccountAddress;
    const stateSmartAccountAddr = smartAccounts[erc4337Node.id];
    
    console.log('=== SMART ACCOUNT DEBUG ===')
    console.log('ERC-4337 Node ID:', erc4337Node.id)
    console.log('ERC-4337 Node Type:', erc4337Node.type)
    console.log('ERC-4337 Node Data:', erc4337Node.data)
    console.log('Smart Accounts State Object:', smartAccounts)
    console.log('State Keys:', Object.keys(smartAccounts))
    console.log('Looking up key:', erc4337Node.id)
    console.log('Smart account from node data:', nodeSmartAccountAddr)
    console.log('Smart account from state lookup:', stateSmartAccountAddr)
    
    // ONLY use addresses that match this specific node - no fallback to other nodes
    const actualSmartAccountAddr = nodeSmartAccountAddr || stateSmartAccountAddr;
    
    console.log('Final smart account address (for THIS node only):', actualSmartAccountAddr)
    console.log('=== END DEBUG ===')
    
    info.push(`\nNode ID: ${erc4337Node.id}`);
    info.push(`Smart Account (node): ${nodeSmartAccountAddr ? nodeSmartAccountAddr.slice(0, 10) + '...' : '✗'}`);
    info.push(`Smart Account (state): ${stateSmartAccountAddr ? stateSmartAccountAddr.slice(0, 10) + '...' : '✗'}`);
    info.push(`Using: ${actualSmartAccountAddr ? actualSmartAccountAddr.slice(0, 10) + '...' : '✗ Not created'}`);
    
    if (!actualSmartAccountAddr) {
      info.push(`\n⚠️ Smart account not created yet for this node`);
      info.push(`Node ID: ${erc4337Node.id}`);
      info.push(`This is likely a new ERC-4337 node that hasn't created its account yet.`);
      info.push(`Wait a moment for the account to be created.`);
      return { ready: false, info: info.join('\n') };
    }

    // Check connections
    const connections = edges.map(e => `${e.source} → ${e.target}`);
    info.push(`\nConnections: ${connections.length > 0 ? connections.join(', ') : 'None'}`);

    // Analyze transfer context
    if (transferNode) {
      const context = analyzeTransferContext(transferNode.id, nodes, edges);
      info.push(`\nOperation Type: ${context.operationType}`);
      
      if (context.permissionParams) {
        info.push(`\nPermission Parameters:`);
        info.push(`- Start Time: ${context.permissionParams.startTime || '✗'}`);
        info.push(`- End Time: ${context.permissionParams.endTime || '✗'}`);
        info.push(`- Amount Limit: ${context.permissionParams.amountLimit || '✗'}`);
        info.push(`- Token Address: ${context.permissionParams.tokenAddress || '✗'}`);
        
        const hasTimeParams = context.permissionParams.startTime && context.permissionParams.endTime;
        const hasLimitParams = context.permissionParams.amountLimit;
        
        // Check for token address if it's an ERC-20 transfer
        if (context.operationType === 'erc20-transfer' && !context.permissionParams.tokenAddress) {
          info.push(`\n❌ Token contract address is REQUIRED for ERC-20 transfers`);
          info.push(`   Configure it in the ERC-20 Tokens node`);
          info.push(`   Example Sepolia USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`);
          return { ready: false, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr };
        }
        
        if (!hasTimeParams) {
          info.push(`\n⚠️ Missing time parameters`);
          return { ready: false, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr };
        }
        
        if (!hasLimitParams) {
          info.push(`\n⚠️ Missing amount limit parameter`);
          return { ready: false, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr };
        }
        
        info.push(`\n✅ Workflow is ready for permissions!`);
        return { ready: true, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr };
      } else {
        info.push(`\n⚠️ No permission parameters found`);
        return { ready: false, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr };
      }
    }

    return { ready: false, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr };
  };

  const handleButtonClick = () => {
    const result = checkWorkflowReadiness();
    setDebugInfo(result.info);
    console.log('Workflow readiness check:', result);
    
    if (result.ready) {
      setShowDialog(true);
    } else {
      toast({
        title: "Workflow not ready",
        description: "Check console for debug information",
        variant: "destructive",
      });
    }
  };

  const handleSuccess = () => {
    setShowDialog(false);
    toast({
      title: "Permissions granted!",
      description: "Your workflow now has execution permissions",
    });
  };

  const handleError = (error: Error) => {
    console.error("Permission request error:", error);
    toast({
      title: "Permission request failed",
      description: error.message,
      variant: "destructive",
    });
  };

  const result = checkWorkflowReadiness();

  return (
    <>
      <Button 
        onClick={handleButtonClick} 
        size="sm" 
        variant={result.ready ? "default" : "outline"}
        className={result.ready ? "bg-green-600 hover:bg-green-700" : ""}
      >
        <Shield className="h-4 w-4 mr-2" />
        Request Permissions
        {result.ready && " ✓"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              🔐 Workflow Permission Request
            </DialogTitle>
            <DialogDescription>
              Grant permissions to allow the smart account to execute transfers within the configured limits.
            </DialogDescription>
          </DialogHeader>
          
          <PermissionProvider>
            <WorkflowPermissionManager
              nodes={nodes}
              edges={edges}
              smartAccount={null}
              smartAccountAddress={result.smartAccountAddr || ""}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </PermissionProvider>

          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs">
            <h4 className="font-semibold mb-2">Debug Info:</h4>
            <p className="text-green-600 font-semibold mb-1">Smart Account Address Being Used:</p>
            <p className="font-mono break-all mb-2">{result.smartAccountAddr || "Not found"}</p>
            <pre className="whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
