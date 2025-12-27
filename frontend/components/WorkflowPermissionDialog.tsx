"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import SmartAccountTransfer from "./SmartAccountTransfer";
import { PermissionProvider } from "@/providers/PermissionProvider";
import type { WorkflowNode } from "@/lib/types";
import type { Edge } from "reactflow";

interface WorkflowPermissionDialogProps {
  nodes: WorkflowNode[];
  edges: Edge[];
  smartAccount: any;
  smartAccountAddress: string;
}

export default function WorkflowPermissionDialog({
  nodes,
  edges,
  smartAccount,
  smartAccountAddress,
}: WorkflowPermissionDialogProps) {
  const [open, setOpen] = useState(false);

  // Check if workflow has required nodes
  const hasERC4337 = nodes.some(n => n.type === 'erc4337');
  const hasTokenOrNFT = nodes.some(n => n.type === 'erc20-tokens' || n.type === 'erc721-nft');
  const hasTransfer = nodes.some(n => n.type === 'transfer');
  
  const isWorkflowReady = hasERC4337 && hasTokenOrNFT && hasTransfer;

  if (!isWorkflowReady) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="space-x-2" variant="default">
          <Shield className="h-4 w-4" />
          <span>Request Permissions</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Workflow Permissions</DialogTitle>
        </DialogHeader>
        <PermissionProvider>
          <SmartAccountTransfer
            smartAccount={smartAccount}
            smartAccountAddress={smartAccountAddress}
            nodes={nodes}
            edges={edges}
          />
        </PermissionProvider>
      </DialogContent>
    </Dialog>
  );
}
