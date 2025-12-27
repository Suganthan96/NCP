"use client";

import { useState } from "react";
import { Hex } from "viem";
import ExecuteTransfer from "./ExecuteTransfer";
import WorkflowPermissionManager from "./WorkflowPermissionManager";
import { usePermissions } from "@/providers/PermissionProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkflowNode } from "@/lib/types";
import type { Edge } from "reactflow";

interface SmartAccountTransferProps {
  smartAccount: any;
  smartAccountAddress: string;
  recipient?: string;
  amount?: string;
  tokenAddress?: string;
  nodes?: WorkflowNode[];
  edges?: Edge[];
}

export default function SmartAccountTransfer({
  smartAccount,
  smartAccountAddress,
  recipient = "",
  amount = "0.001",
  tokenAddress,
  nodes = [],
  edges = [],
}: SmartAccountTransferProps) {
  const { hasPermission } = usePermissions();
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [transferError, setTransferError] = useState<Error | null>(null);

  const handleTransferSuccess = (hash: Hex) => {
    console.log("Transfer successful:", hash);
    setTxHash(hash);
    setTransferError(null);
  };

  const handleTransferError = (error: Error) => {
    console.error("Transfer failed:", error);
    setTransferError(error);
  };

  const handlePermissionSuccess = () => {
    console.log("Permissions granted successfully");
  };

  const handlePermissionError = (error: Error) => {
    console.error("Failed to grant permissions:", error);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-lg text-white">
        <h2 className="text-2xl font-bold mb-2">ERC-4337 Smart Account</h2>
        <p className="text-sm opacity-90">Execute gasless transactions with account abstraction</p>
        <div className="mt-4 bg-white/20 backdrop-blur-sm p-3 rounded">
          <p className="text-xs opacity-75">Smart Account Address</p>
          <p className="font-mono text-sm break-all">{smartAccountAddress}</p>
        </div>
      </div>

      <Tabs defaultValue="transfer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transfer">Execute Transfer</TabsTrigger>
          <TabsTrigger value="permissions">
            Permissions {hasPermission && "✓"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transfer" className="space-y-4">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Transfer Funds</h3>
            {recipient && amount ? (
              <ExecuteTransfer
                smartAccountAddress={smartAccountAddress}
                smartAccount={smartAccount}
                recipient={recipient}
                amount={amount}
                tokenAddress={tokenAddress}
                onSuccess={handleTransferSuccess}
                onError={handleTransferError}
              />
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  ⚠️ Please configure the transfer parameters in the workflow or provide recipient and amount.
                </p>
              </div>
            )}
          </div>

          {transferError && (
            <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-600 p-4 rounded-lg">
              <p className="text-red-800 dark:text-red-200 font-semibold">Transfer Error</p>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">{transferError.message}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Workflow Permissions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Grant execution permissions based on your workflow configuration.
              The system will automatically detect time limits and amount restrictions from your workflow nodes.
            </p>
            {nodes.length > 0 && edges.length > 0 ? (
              <WorkflowPermissionManager
                nodes={nodes}
                edges={edges}
                smartAccount={smartAccount}
                smartAccountAddress={smartAccountAddress}
                onSuccess={handlePermissionSuccess}
                onError={handlePermissionError}
              />
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  ⚠️ Workflow data not available. Please use this from within the workflow builder.
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4 text-sm space-y-2">
        <h4 className="font-semibold">How ERC-4337 Works:</h4>
        <ul className="space-y-1 text-gray-700 dark:text-gray-300">
          <li>✓ <strong>Smart Account:</strong> Your transactions are sent from a smart contract, not your EOA</li>
          <li>✓ <strong>UserOperation:</strong> Transactions are bundled and submitted by a bundler</li>
          <li>✓ <strong>Paymaster:</strong> Optional gas sponsorship for gasless transactions</li>
          <li>✓ <strong>Permissions:</strong> ERC-7715 enables delegated execution with fine-grained control</li>
        </ul>
      </div>
    </div>
  );
}
