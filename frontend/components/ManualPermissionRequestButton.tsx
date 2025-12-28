"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TokenPermissionCard from "./TokenPermissionCard";
import { PermissionProvider } from "@/providers/PermissionProvider";
import { analyzeTransferContext, validateWorkflowConnectionOrder } from "@/lib/workflow-executor";
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
  const [allTokenNodes, setAllTokenNodes] = useState<WorkflowNode[]>([]);
  const [smartAccountAddr, setSmartAccountAddr] = useState<string>("");

  const checkWorkflowReadiness = () => {
    const info: string[] = [];
    
    console.log('=== Workflow Readiness Check ===')
    console.log('Nodes:', nodes)
    console.log('Edges:', edges)
    console.log('Smart Accounts State:', smartAccounts)
    
    // Validate workflow connection order first
    const connectionValidation = validateWorkflowConnectionOrder(nodes, edges);
    
    info.push(`Connection Order Validation:`);
    if (!connectionValidation.valid) {
      info.push(`❌ ${connectionValidation.reason}`);
      if (connectionValidation.details) {
        info.push(`\nExpected: ${connectionValidation.details.expected}`);
        info.push(`Found: ${connectionValidation.details.found}`);
      }
      info.push(`\n⚠️ Required connection order:`);
      info.push(`   ERC-4337 Account → Transfer → (Native Token OR ERC-20 Token)`);
      return { ready: false, info: info.join('\n') };
    }
    
    info.push(`✓ Correct order: ${connectionValidation.details?.order}`);
    info.push(`✓ Token type: ${connectionValidation.details?.tokenType}`);
    
    // Find required nodes (skip agent-default as it's just a visual representation)
    const erc4337Node = nodes.find(n => n.type === 'erc4337' && n.id !== 'agent-default');
    const transferNode = nodes.find(n => n.type === 'transfer');
    const tokenNode = nodes.find(n => n.type === 'erc20-tokens');
    const nativeTokenNode = nodes.find(n => n.type === 'native-token');

    // These should all exist due to validation above, but check anyway
    if (!erc4337Node || !transferNode || (!tokenNode && !nativeTokenNode)) {
      info.push(`\n⚠️ Critical nodes missing after validation`);
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
      
      // Collect all token nodes (both ERC-20 and Native)
      const allTokens: WorkflowNode[] = [];
      if (context.allTokenNodes && context.allTokenNodes.length > 0) {
        allTokens.push(...context.allTokenNodes);
      }
      if (context.allNativeTokenNodes && context.allNativeTokenNodes.length > 0) {
        allTokens.push(...context.allNativeTokenNodes);
      }
      
      info.push(`\nFound ${allTokens.length} token node(s):`);
      allTokens.forEach((token, idx) => {
        const tokenData = token.data as any;
        const isNative = token.type === 'native-token';
        info.push(`  ${idx + 1}. ${isNative ? 'Native ETH' : `ERC-20 ${tokenData.symbol || ''}`}`);
        info.push(`     - Start: ${tokenData.startTime || '✗'}`);
        info.push(`     - End: ${tokenData.endTime || '✗'}`);
        info.push(`     - Amount: ${tokenData.amountLimit || tokenData.amount || '✗'}`);
        if (!isNative && !tokenData.tokenAddress) {
          info.push(`     ❌ Missing token address`);
        }
      });
      
      // Validate each token has required parameters
      let allValid = true;
      for (const token of allTokens) {
        const tokenData = token.data as any;
        const isNative = token.type === 'native-token';
        
        if (!tokenData.startTime || !tokenData.endTime) {
          info.push(`\n⚠️ ${isNative ? 'Native ETH' : tokenData.symbol || 'Token'} node missing time parameters`);
          allValid = false;
        }
        
        if (!tokenData.amountLimit && !tokenData.amount) {
          info.push(`\n⚠️ ${isNative ? 'Native ETH' : tokenData.symbol || 'Token'} node missing amount limit`);
          allValid = false;
        }
        
        if (!isNative && !tokenData.tokenAddress) {
          info.push(`\n❌ ${tokenData.symbol || 'ERC-20'} token missing contract address`);
          allValid = false;
        }
      }
      
      if (allTokens.length === 0) {
        info.push(`\n⚠️ No token nodes found connected to Transfer`);
        return { ready: false, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr };
      }
      
      if (!allValid) {
        return { ready: false, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr, tokenNodes: allTokens };
      }
      
      info.push(`\n✅ All ${allTokens.length} token node(s) are ready for permissions!`);
      info.push(`\n💡 You can grant permissions for each token separately`);
      return { ready: true, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr, tokenNodes: allTokens };
    }

    return { ready: false, info: info.join('\n'), smartAccountAddr: actualSmartAccountAddr };
  };

  const handleButtonClick = () => {
    const result = checkWorkflowReadiness();
    setDebugInfo(result.info);
    console.log('Workflow readiness check:', result);
    
    if (result.ready && result.tokenNodes && result.smartAccountAddr) {
      setAllTokenNodes(result.tokenNodes);
      setSmartAccountAddr(result.smartAccountAddr);
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
    toast({
      title: "Permission granted!",
      description: "Token permission has been successfully granted",
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              🔐 Grant Token Permissions
            </DialogTitle>
            <DialogDescription>
              Grant permissions for each token separately. All tokens use the same smart account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-3 rounded">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Smart Account:</strong>
              </p>
              <p className="font-mono text-xs text-blue-700 dark:text-blue-300 break-all">
                {smartAccountAddr}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                💡 Grant permissions for each token individually. You can approve them one at a time.
              </p>
            </div>

            <PermissionProvider>
              <div className="space-y-3">
                {allTokenNodes.map((tokenNode, index) => (
                  <TokenPermissionCard
                    key={tokenNode.id}
                    tokenNode={tokenNode}
                    smartAccountAddress={smartAccountAddr}
                    onSuccess={handleSuccess}
                    onError={handleError}
                  />
                ))}
              </div>
            </PermissionProvider>
          </div>

          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs">
            <h4 className="font-semibold mb-2">Debug Info:</h4>
            <p className="text-green-600 font-semibold mb-1">Smart Account Address:</p>
            <p className="font-mono break-all mb-2">{smartAccountAddr || "Not found"}</p>
            <p className="text-blue-600 font-semibold mb-1">Token Nodes: {allTokenNodes.length}</p>
            <pre className="whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
