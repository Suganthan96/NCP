"use client";

import { useState } from "react";
import { parseEther, parseUnits } from "viem";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { usePermissions } from "@/providers/PermissionProvider";
import { Loader2, CheckCircle, Shield, Clock, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChainId, useWalletClient } from "wagmi";
import type { WorkflowNode } from "@/lib/types";

interface TokenPermissionCardProps {
  tokenNode: WorkflowNode;
  smartAccountAddress: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function TokenPermissionCard({
  tokenNode,
  smartAccountAddress,
  onSuccess,
  onError,
}: TokenPermissionCardProps) {
  const { savePermission, hasPermissionForAccount } = usePermissions();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const tokenData = tokenNode.data as any;
  const isNativeToken = tokenNode.type === 'native-token';
  const tokenType = isNativeToken ? 'Native ETH' : `ERC-20 (${tokenData.symbol || 'Token'})`;
  
  // Check if THIS specific token node has permission for this smart account
  const permissionKey = `${smartAccountAddress}-${tokenNode.id}`;
  const hasPermission = hasPermissionForAccount(permissionKey);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleString();
  };

  const calculateDuration = () => {
    if (tokenData.startTime && tokenData.endTime) {
      const durationMs = new Date(tokenData.endTime).getTime() - new Date(tokenData.startTime).getTime();
      const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
    }
    return 'Duration not set';
  };

  const handleGrantPermission = async () => {
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

    setIsLoading(true);
    setError(null);

    try {
      console.log('=== SINGLE TOKEN PERMISSION REQUEST DEBUG ===');
      console.log('Token Node:', tokenNode);
      console.log('Token Type:', tokenType);
      console.log('Smart Account Address:', smartAccountAddress);
      console.log('Chain ID:', chainId);

      const client = walletClient.extend(erc7715ProviderActions());

      let permissionData: any;

      if (isNativeToken) {
        // Native ETH permission
        const ethAmount = tokenData.amount || tokenData.amountLimit || "0.001";
        
        // Validate and calculate timestamps
        if (!tokenData.startTime || !tokenData.endTime) {
          throw new Error("Start time and end time are required for permissions");
        }
        
        const startDate = new Date(tokenData.startTime);
        const endDate = new Date(tokenData.endTime);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error("Invalid start or end time format");
        }
        
        const startTimestamp = Math.floor(startDate.getTime() / 1000);
        const expiry = Math.floor(endDate.getTime() / 1000);
        const periodDuration = expiry - startTimestamp;
        
        if (periodDuration <= 0) {
          throw new Error("End time must be after start time");
        }

        console.log('Native ETH Permission:', {
          amount: ethAmount,
          periodDuration,
          startTime: startTimestamp,
          expiry: expiry,
          startTimeReadable: new Date(startTimestamp * 1000).toISOString(),
          expiryReadable: new Date(expiry * 1000).toISOString()
        });

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
              periodDuration,
              startTime: startTimestamp,
              justification: `Permission to transfer up to ${ethAmount} ETH`,
            },
          },
        };
      } else {
        // ERC-20 Token permission
        const tokenAddress = tokenData.tokenAddress;
        const tokenAmount = tokenData.amount || tokenData.amountLimit || "1";
        const tokenDecimals = tokenData.decimals || 18;
        
        if (!tokenAddress) {
          throw new Error("Token contract address is required for ERC-20 permissions");
        }
        
        // Validate and calculate timestamps
        if (!tokenData.startTime || !tokenData.endTime) {
          throw new Error("Start time and end time are required for permissions");
        }
        
        const startDate = new Date(tokenData.startTime);
        const endDate = new Date(tokenData.endTime);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error("Invalid start or end time format");
        }

        const startTimestamp = Math.floor(startDate.getTime() / 1000);
        const expiry = Math.floor(endDate.getTime() / 1000);
        const periodDuration = expiry - startTimestamp;
        
        if (periodDuration <= 0) {
          throw new Error("End time must be after start time");
        }

        console.log('ERC-20 Token Permission:', {
          tokenAddress,
          amount: tokenAmount,
          decimals: tokenDecimals,
          periodDuration,
          startTime: startTimestamp,
          expiry: expiry,
          startTimeReadable: new Date(startTimestamp * 1000).toISOString(),
          expiryReadable: new Date(expiry * 1000).toISOString()
        });

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
              tokenAddress: tokenAddress as `0x${string}`,
              periodAmount: parseUnits(tokenAmount, tokenDecimals),
              periodDuration,
              startTime: startTimestamp,
              justification: `Permission to transfer up to ${tokenAmount} ${tokenData.symbol}`,
            },
          },
        };
      }

      console.log('Permission data built:', permissionData);

      const permissions = await client.requestExecutionPermissions([permissionData]);
      
      console.log('Permission granted! Saving for key:', permissionKey);
      console.log('Permissions response:', permissions);
      console.log('Permissions type:', typeof permissions);
      console.log('Permissions is array:', Array.isArray(permissions));
      
      // Validate permissions response
      if (!permissions) {
        throw new Error('No permissions returned from MetaMask');
      }
      
      if (!Array.isArray(permissions) || permissions.length === 0) {
        console.error('Invalid permissions response:', permissions);
        throw new Error('Invalid permissions response from MetaMask');
      }
      
      // Save permission with unique key for this token + smart account
      savePermission(permissions[0], permissionKey);
      console.log(`✅ Permission granted and saved for: ${permissionKey}`);
      console.log('=== END DEBUG ===');
      onSuccess?.();
      
    } catch (err: any) {
      console.error('Error granting permission:', err);
      setError(err.message || 'Failed to grant permission');
      onError?.(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (hasPermission) {
    return (
      <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-600 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <h4 className="font-semibold text-green-800 dark:text-green-200">
                {tokenType} - Permission Granted ✓
              </h4>
              <p className="text-xs text-green-600 dark:text-green-400">
                {isNativeToken ? `${tokenData.amount || '0.001'} ETH` : `${tokenData.amount || '1'} ${tokenData.symbol}`}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {tokenType}
        </h4>
        {!isNativeToken && tokenData.symbol && (
          <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded">
            {tokenData.symbol}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-gray-600 dark:text-gray-400">
              {formatDate(tokenData.startTime)} → {formatDate(tokenData.endTime)}
            </p>
            <p className="text-xs text-gray-500">{calculateDuration()}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Coins className="h-4 w-4 text-gray-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-gray-600 dark:text-gray-400">
              Limit: {tokenData.amountLimit || tokenData.amount || 'Not set'}
              {isNativeToken ? ' ETH' : ` ${tokenData.symbol || 'tokens'}`}
            </p>
          </div>
        </div>

        {!isNativeToken && tokenData.tokenAddress && (
          <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
            <p className="text-xs text-gray-500">Contract:</p>
            <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
              {tokenData.tokenAddress}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600 p-2 rounded">
          <p className="text-red-800 dark:text-red-200 text-xs">{error}</p>
        </div>
      )}

      <Button
        className="w-full"
        size="sm"
        onClick={handleGrantPermission}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Requesting...
          </>
        ) : (
          <>
            <Shield className="h-4 w-4 mr-2" />
            Grant Permission
          </>
        )}
      </Button>
    </div>
  );
}
