"use client";

import { useState, useEffect } from "react";
import { parseEther, parseUnits } from "viem";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { usePermissions } from "@/providers/PermissionProvider";
import { Loader2, CheckCircle, Shield, Clock, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChainId, useWalletClient } from "wagmi";
import { analyzeTransferContext, type PermissionParameters } from "@/lib/workflow-executor";
import type { WorkflowNode } from "@/lib/types";
import type { Edge } from "reactflow";

interface WorkflowPermissionManagerProps {
  nodes: WorkflowNode[];
  edges: Edge[];
  smartAccount: any;
  smartAccountAddress: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function WorkflowPermissionManager({
  nodes,
  edges,
  smartAccount,
  smartAccountAddress,
  onSuccess,
  onError,
}: WorkflowPermissionManagerProps) {
  const { savePermission, hasPermissionForAccount } = usePermissions();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedParams, setDetectedParams] = useState<PermissionParameters | null>(null);
  const [workflowType, setWorkflowType] = useState<string>('');

  // Log the smart account address being used
  console.log('WorkflowPermissionManager - Smart Account Address:', smartAccountAddress);

  // Check if THIS specific smart account has permission
  const hasPermission = smartAccountAddress ? hasPermissionForAccount(smartAccountAddress) : false;

  // Analyze workflow on mount and when nodes/edges change
  useEffect(() => {
    // Find transfer nodes and analyze their context
    const transferNodes = nodes.filter(n => n.type === 'transfer');
    
    if (transferNodes.length > 0) {
      const context = analyzeTransferContext(transferNodes[0].id, nodes, edges);
      
      if (context.permissionParams && context.smartAccountNode) {
        setDetectedParams(context.permissionParams);
        setWorkflowType(context.operationType);
      }
    }
  }, [nodes, edges]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const calculateDuration = (params: PermissionParameters) => {
    if (params.startTime && params.endTime) {
      const durationMs = new Date(params.endTime).getTime() - new Date(params.startTime).getTime();
      const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    }
    return 'Duration not set';
  };

  /**
   * Requests execution permissions based on workflow configuration
   */
  const handleGrantPermissions = async () => {
    if (!smartAccountAddress) {
      const err = new Error("Smart account address not found");
      setError(err.message);
      onError?.(err);
      return;
    }

    if (!walletClient) {
      const err = new Error("Wallet client not connected");
      setError(err.message);
      onError?.(err);
      return;
    }

    if (!detectedParams) {
      const err = new Error("No permission parameters detected in workflow");
      setError(err.message);
      onError?.(err);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = walletClient.extend(erc7715ProviderActions());
      
      console.log('=== PERMISSION REQUEST DEBUG ===');
      console.log('Smart Account Address (from props):', smartAccountAddress);
      console.log('Chain ID:', chainId);
      console.log('Detected Params:', detectedParams);
      console.log('Workflow Type:', workflowType);
      
      // Calculate expiry from end time or default to 30 days
      const expiry = detectedParams.endTime 
        ? Math.floor(new Date(detectedParams.endTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

      const startTimestamp = detectedParams.startTime 
        ? Math.floor(new Date(detectedParams.startTime).getTime() / 1000)
        : Math.floor(Date.now() / 1000);

      console.log('Expiry timestamp:', expiry);
      console.log('Start timestamp:', startTimestamp);
      console.log('Using Smart Account Address:', smartAccountAddress);

      // Build permission request based on workflow type
      let permissionData: any;

      console.log('Building permission request...');
      console.log('Workflow Type:', workflowType);
      console.log('Smart Account Address to use in signer:', smartAccountAddress);
      console.log('Token Address from params:', detectedParams.tokenAddress);
      console.log('Amount Limit:', detectedParams.amountLimit);
      console.log('Period Amount:', detectedParams.periodAmount);
      console.log('Token Decimals:', detectedParams.decimals);
      console.log('Token Symbol:', detectedParams.symbol);

      // Validate token address is set for ERC-20 transfers
      if (workflowType === 'erc20-transfer' && !detectedParams.tokenAddress) {
        throw new Error('Token contract address is required for ERC-20 transfers. Please select a token in the ERC-20 Tokens node.');
      }

      if (workflowType === 'erc20-transfer' && detectedParams.tokenAddress) {
        // Use token decimals from the node configuration, default to 6 for common stablecoins
        const tokenDecimals = detectedParams.decimals || 6;
        
        // ERC-20 token permission
        permissionData = {
          chainId,
          expiry,
          signer: {
            type: "account",
            data: {
              address: smartAccountAddress as `0x${string}`,
            },
          },
          isAdjustmentAllowed: true,
          permission: {
            type: "erc20-token-periodic",
            data: {
              tokenAddress: detectedParams.tokenAddress as `0x${string}`,
              // Use the correct decimals for the token (e.g., 6 for USDC/USDT, 18 for most others)
              periodAmount: parseUnits(detectedParams.amountLimit || detectedParams.periodAmount || "0.001", tokenDecimals),
              periodDuration: detectedParams.periodDuration || 86400,
              startTime: startTimestamp,
              justification: `Permission to transfer up to ${detectedParams.amountLimit || detectedParams.periodAmount} ${detectedParams.symbol || 'tokens'} from ${formatDate(detectedParams.startTime)} to ${formatDate(detectedParams.endTime)}`,
            },
          },
        };
      } else {
        // Native token (ETH) permission
        const ethAmount = detectedParams?.amountLimit || detectedParams?.periodAmount || "0.01";
        
        permissionData = {
          chainId,
          expiry,
          signer: {
            type: "account",
            data: {
              address: smartAccountAddress as `0x${string}`,
            },
          },
          isAdjustmentAllowed: true,
          permission: {
            type: "native-token-periodic",
            data: {
              periodAmount: parseEther(ethAmount),
              periodDuration: detectedParams?.periodDuration || 86400,
              startTime: startTimestamp,
              justification: `Permission to transfer up to ${ethAmount} ETH from ${formatDate(detectedParams?.startTime)} to ${formatDate(detectedParams?.endTime)}`,
            },
          },
        };
      }

      console.log('Permission data built:', {
        ...permissionData,
        signer: {
          ...permissionData.signer,
          data: {
            address: permissionData.signer.data.address
          }
        }
      });

      const permissions = await client.requestExecutionPermissions([permissionData]);
      
      console.log('Permission granted! Saving for address:', smartAccountAddress);
      console.log('Permissions response:', permissions);
      
      // Save permission for this specific smart account
      savePermission(permissions[0], smartAccountAddress);
      console.log(`✅ Permission granted and saved for smart account: ${smartAccountAddress}`);
      console.log('=== END PERMISSION REQUEST DEBUG ===');
      onSuccess?.();
      
    } catch (err: any) {
      console.error('Error granting permissions:', err);
      setError(err.message || 'Failed to grant permissions');
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (hasPermission) {
    return (
      <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-600 p-6 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Shield className="h-6 w-6 text-green-600" />
          <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">
            Permissions Granted
          </h3>
        </div>
        <p className="text-green-700 dark:text-green-300 mb-2">
          This smart account has active execution permissions.
        </p>
        <p className="text-xs text-green-600 dark:text-green-400 font-mono">
          Account: {smartAccountAddress.slice(0, 10)}...{smartAccountAddress.slice(-8)}
        </p>
      </div>
    );
  }

  if (!detectedParams) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-4 rounded-lg">
        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
          ⚠️ No permission parameters detected. Make sure your workflow has:
          <br />• ERC-4337 node with smart account
          <br />• ERC-20 or ERC-721 node with time limits configured
          <br />• Transfer node connected in series
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 p-6 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Workflow Permission Request
        </h4>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Time Period</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                From: <span className="font-semibold">{formatDate(detectedParams.startTime)}</span>
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                To: <span className="font-semibold">{formatDate(detectedParams.endTime)}</span>
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Duration: {calculateDuration(detectedParams)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Coins className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Limits</p>
              {detectedParams.amountLimit && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Amount Limit: <span className="font-semibold">{detectedParams.amountLimit} tokens</span>
                </p>
              )}
              {detectedParams.maxTransfers && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Max Transfers: <span className="font-semibold">{detectedParams.maxTransfers} NFTs</span>
                </p>
              )}
              {detectedParams.periodAmount && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Per Transaction: <span className="font-semibold">{detectedParams.periodAmount}</span>
                </p>
              )}
            </div>
          </div>

          {(detectedParams.tokenAddress || detectedParams.nftContract) && (
            <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded">
              <p className="text-xs text-gray-600 dark:text-gray-400">Contract Address:</p>
              <p className="font-mono text-xs break-all text-gray-800 dark:text-gray-200">
                {detectedParams.tokenAddress || detectedParams.nftContract}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600 p-4 rounded-lg">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}

      <Button
        className="w-full space-x-2"
        onClick={handleGrantPermissions}
        disabled={isLoading}
      >
        <span>
          {isLoading ? "Requesting Permissions..." : "Grant Workflow Permissions"}
        </span>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle className="h-5 w-5" />
        )}
      </Button>

      {isLoading && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>📝 Sending permission request to MetaMask...</p>
          <p className="mt-1">Please approve in your wallet extension</p>
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-4 text-xs space-y-2">
        <h5 className="font-semibold">What happens next?</h5>
        <ul className="space-y-1 text-gray-700 dark:text-gray-300">
          <li>✓ MetaMask will request your approval for these permissions</li>
          <li>✓ Permissions are scoped to the time period and limits you configured</li>
          <li>✓ Your smart account can execute transfers within these constraints</li>
          <li>✓ You can revoke permissions at any time through MetaMask</li>
        </ul>
      </div>
    </div>
  );
}
