"use client";

import { useState } from "react";
import { Hex, parseEther, encodeFunctionData } from "viem";
import { pimlicoClientFactory } from "@/services/pimlicoClient";
import { bundlerClientFactory } from "@/services/bundlerClient";
import { Loader2, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount, usePublicClient } from "wagmi";

interface ExecuteTransferProps {
  smartAccountAddress: string;
  smartAccount: any; // SmartAccount from @metamask/smart-accounts-kit
  recipient: string;
  amount: string;
  tokenAddress?: string; // Optional: for ERC-20 transfers
  onSuccess?: (txHash: Hex) => void;
  onError?: (error: Error) => void;
}

export default function ExecuteTransfer({
  smartAccountAddress,
  smartAccount,
  recipient,
  amount,
  tokenAddress,
  onSuccess,
  onError,
}: ExecuteTransferProps) {
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicClient = usePublicClient();
  const { chain } = useAccount();

  /**
   * Executes an ETH or ERC-20 token transfer using ERC-4337 UserOperation
   */
  const handleExecuteTransfer = async () => {
    if (!chain || !publicClient || !smartAccount) {
      const err = new Error("Missing required parameters");
      setError(err.message);
      onError?.(err);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Initialize Pimlico and Bundler clients
      const pimlicoClient = pimlicoClientFactory(chain.id);
      const bundlerClient = bundlerClientFactory(chain.id);

      // Get gas price estimation
      const { fast: fee } = await pimlicoClient.getUserOperationGasPrice();

      let callData: Hex;
      let value: bigint;
      let to: string;

      if (tokenAddress) {
        // ERC-20 Transfer
        // transfer(address to, uint256 amount)
        const transferAbi = [{
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ type: 'bool' }]
        }] as const;

        callData = encodeFunctionData({
          abi: transferAbi,
          functionName: 'transfer',
          args: [recipient as `0x${string}`, parseEther(amount)]
        });
        value = BigInt(0);
        to = tokenAddress;
      } else {
        // Native ETH Transfer
        callData = '0x';
        value = parseEther(amount);
        to = recipient;
      }

      /**
       * Send UserOperation to the bundler
       * This operation includes:
       * - Transfer calldata (ETH or ERC-20)
       * - Smart account as the sender
       * - Gas fee information from Pimlico
       * - Optional paymaster for gasless transactions
       */
      const userOpHash = await bundlerClient.sendUserOperation({
        account: smartAccount,
        calls: [
          {
            to: to as `0x${string}`,
            data: callData,
            value: value,
          },
        ],
        ...fee,
      });

      console.log("UserOperation submitted:", userOpHash);

      // Wait for the transaction to be mined
      const { receipt } = await bundlerClient.waitForUserOperationReceipt({
        hash: userOpHash,
      });

      console.log("Transaction receipt:", receipt);

      setTxHash(receipt.transactionHash);
      onSuccess?.(receipt.transactionHash);

    } catch (err: any) {
      console.error("Transfer execution error:", err);
      setError(err.message || "Failed to execute transfer");
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  if (txHash) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-200 dark:border-green-600 p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">
              Transfer Successful!
            </h3>
          </div>
          <p className="text-green-700 dark:text-green-300 mb-4">
            Your transfer has been processed via ERC-4337 smart account.
          </p>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">From:</span>
              <span className="font-mono text-xs">{smartAccountAddress.slice(0, 10)}...{smartAccountAddress.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">To:</span>
              <span className="font-mono text-xs">{recipient.slice(0, 10)}...{recipient.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Amount:</span>
              <span className="font-semibold">{amount} {tokenAddress ? 'Tokens' : 'ETH'}</span>
            </div>
          </div>

          <Button
            className="w-full space-x-2"
            onClick={() =>
              window.open(`${chain?.blockExplorers?.default?.url}/tx/${txHash}`, '_blank')
            }
          >
            <span>View on {chain?.blockExplorers?.default?.name}</span>
            <ExternalLink className="h-5 w-5" />
          </Button>
        </div>

        <Button
          className="w-full"
          variant="outline"
          onClick={() => {
            setTxHash(null);
            setError(null);
          }}
        >
          Execute Another Transfer
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-600 p-6 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <h3 className="text-xl font-semibold text-red-800 dark:text-red-200">
              Transfer Failed
            </h3>
          </div>
          <p className="text-red-700 dark:text-red-300 text-sm mb-4">
            {error}
          </p>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setError(null);
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Transfer Details</h4>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <div className="flex justify-between">
            <span>Smart Account:</span>
            <span className="font-mono text-xs">{smartAccountAddress.slice(0, 8)}...{smartAccountAddress.slice(-6)}</span>
          </div>
          <div className="flex justify-between">
            <span>Recipient:</span>
            <span className="font-mono text-xs">{recipient.slice(0, 8)}...{recipient.slice(-6)}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-semibold">{amount} {tokenAddress ? 'Tokens' : 'ETH'}</span>
          </div>
          {tokenAddress && (
            <div className="flex justify-between">
              <span>Token:</span>
              <span className="font-mono text-xs">{tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}</span>
            </div>
          )}
        </div>
      </div>

      <Button
        className="w-full space-x-2"
        onClick={handleExecuteTransfer}
        disabled={loading}
      >
        <span>
          {loading ? "Processing UserOperation..." : "Execute Transfer"}
        </span>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle className="h-5 w-5" />
        )}
      </Button>

      {loading && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>📦 Creating UserOperation...</p>
          <p className="mt-1">⚡ Submitting to bundler...</p>
          <p className="mt-1">⏳ Waiting for confirmation...</p>
        </div>
      )}
    </div>
  );
}
