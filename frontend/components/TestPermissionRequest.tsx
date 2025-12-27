"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { useChainId, useWalletClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, TestTube } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function TestPermissionRequest() {
  const [smartAccountAddress, setSmartAccountAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const handleTestPermission = async () => {
    if (!walletClient) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your MetaMask wallet",
        variant: "destructive",
      });
      return;
    }

    if (!smartAccountAddress || !smartAccountAddress.startsWith('0x')) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid smart account address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSuccess(false);

    try {
      console.log('=== Testing Permission Request ===');
      console.log('Chain ID:', chainId);
      console.log('Smart Account:', smartAccountAddress);
      console.log('Wallet Client:', walletClient);

      const client = walletClient.extend(erc7715ProviderActions());
      console.log('Extended client with ERC-7715 actions');

      const currentTime = Math.floor(Date.now() / 1000);
      const expiry = currentTime + (30 * 24 * 60 * 60); // 30 days

      console.log('Current time:', currentTime);
      console.log('Expiry:', expiry);

      const permissionRequest = {
        chainId,
        expiry,
        signer: {
          type: "account" as const,
          data: {
            address: smartAccountAddress as `0x${string}`,
          },
        },
        isAdjustmentAllowed: true,
        permission: {
          type: "native-token-periodic" as const,
          data: {
            periodAmount: parseEther("0.001"),
            periodDuration: 86400, // 1 day
            justification: "Test permission: 0.001 ETH per day",
          },
        },
      };

      console.log('Permission request:', {
        ...permissionRequest,
        permission: {
          ...permissionRequest.permission,
          data: {
            ...permissionRequest.permission.data,
            periodAmount: permissionRequest.permission.data.periodAmount.toString() + ' wei'
          }
        }
      });
      console.log('Calling requestExecutionPermissions...');

      const permissions = await client.requestExecutionPermissions([permissionRequest]);
      
      console.log('✅ Permissions granted:', permissions);
      
      setSuccess(true);
      toast({
        title: "Permission granted!",
        description: "The permission request was successful",
      });

    } catch (error: any) {
      console.error('❌ Permission request failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        data: error.data,
        stack: error.stack,
      });
      
      toast({
        title: "Permission request failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-2 border-purple-300 rounded-lg p-4 bg-purple-50 space-y-4">
      <div className="flex items-center gap-2">
        <TestTube className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-purple-900">Test Permission Request</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="testSmartAccount">Smart Account Address</Label>
        <Input
          id="testSmartAccount"
          value={smartAccountAddress}
          onChange={(e) => setSmartAccountAddress(e.target.value)}
          placeholder="0x..."
          className="font-mono text-sm"
        />
        <p className="text-xs text-gray-600">
          Enter any smart account address to test the permission flow
        </p>
      </div>

      <Button
        onClick={handleTestPermission}
        disabled={isLoading || !smartAccountAddress}
        className="w-full"
        variant={success ? "default" : "outline"}
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {success && <CheckCircle className="h-4 w-4 mr-2 text-green-600" />}
        {isLoading ? "Requesting Permission..." : success ? "Permission Granted ✓" : "Test Permission Request"}
      </Button>

      <div className="bg-white rounded p-3 text-xs space-y-1">
        <p className="font-semibold">Test Details:</p>
        <p>• Type: Native Token (ETH)</p>
        <p>• Amount: 0.001 ETH per day</p>
        <p>• Duration: 30 days</p>
        <p>• Network: {chainId === 11155111 ? 'Sepolia' : `Chain ${chainId}`}</p>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-300 rounded p-3 text-sm text-green-800">
          ✅ Permission request successful! Check your MetaMask for the granted permission.
        </div>
      )}
    </div>
  );
}
