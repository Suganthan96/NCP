"use client";

import { useState, useEffect } from "react";
import { useWalletClient } from "wagmi";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import WorkflowPermissionManager from "./WorkflowPermissionManager";
import { PermissionProvider } from "@/providers/PermissionProvider";
import { analyzeTransferContext } from "@/lib/workflow-executor";
import type { WorkflowNode } from "@/lib/types";
import type { Edge } from "reactflow";

interface AutoPermissionRequestProps {
  nodes: WorkflowNode[];
  edges: Edge[];
  smartAccounts: Record<string, string>;
}

export default function AutoPermissionRequest({
  nodes,
  edges,
  smartAccounts,
}: AutoPermissionRequestProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [workflowReady, setWorkflowReady] = useState(false);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string>("");
  const [hasShownOnce, setHasShownOnce] = useState(false);
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    // Check if workflow is ready for permission request
    const checkWorkflowReadiness = () => {
      // Find required nodes
      const erc4337Node = nodes.find(n => n.type === 'erc4337');
      const transferNode = nodes.find(n => n.type === 'transfer');
      const tokenNode = nodes.find(n => n.type === 'erc20-tokens' || n.type === 'erc721-nft');

      if (!erc4337Node || !transferNode || !tokenNode) {
        setWorkflowReady(false);
        return;
      }

      // Check if nodes are connected properly
      const erc4337Connected = edges.some(e => e.source === erc4337Node.id);
      const tokenConnected = edges.some(e => e.target === transferNode.id && (e.source === tokenNode.id || edges.some(e2 => e2.target === tokenNode.id)));
      
      if (!erc4337Connected || !tokenConnected) {
        setWorkflowReady(false);
        return;
      }

      // Check if smart account is created
      const smartAccountAddr = smartAccounts[erc4337Node.id];
      if (!smartAccountAddr) {
        setWorkflowReady(false);
        return;
      }

      // Analyze transfer context to check for permission parameters
      const context = analyzeTransferContext(transferNode.id, nodes, edges);
      
      if (!context.permissionParams) {
        setWorkflowReady(false);
        return;
      }

      // Check if permission parameters are configured
      const params = context.permissionParams;
      const hasTimeParams = params.startTime && params.endTime;
      const hasLimitParams = params.amountLimit || params.maxTransfers;

      if (!hasTimeParams || !hasLimitParams) {
        setWorkflowReady(false);
        return;
      }

      // Everything is ready!
      setWorkflowReady(true);
      setSmartAccountAddress(smartAccountAddr);
      
      // Auto-show dialog when workflow becomes ready (only once per session)
      if (!hasShownOnce) {
        setShowDialog(true);
        setHasShownOnce(true);
      }
    };

    checkWorkflowReadiness();
  }, [nodes, edges, smartAccounts, hasShownOnce]);

  const handleSuccess = () => {
    setShowDialog(false);
  };

  const handleError = (error: Error) => {
    console.error("Permission request error:", error);
    // Keep dialog open so user can retry
  };

  if (!workflowReady || !walletClient) {
    return null;
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            🔐 Workflow Permission Request
          </DialogTitle>
          <DialogDescription>
            Your workflow is ready! Grant permissions to allow the smart account to execute transfers within the configured limits.
          </DialogDescription>
        </DialogHeader>
        
        <PermissionProvider>
          <WorkflowPermissionManager
            nodes={nodes}
            edges={edges}
            smartAccount={null}
            smartAccountAddress={smartAccountAddress}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </PermissionProvider>
      </DialogContent>
    </Dialog>
  );
}
