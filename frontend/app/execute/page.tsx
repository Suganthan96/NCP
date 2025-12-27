"use client";

import { useSearchParams } from "next/navigation";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import SmartAccountTransfer from "@/components/SmartAccountTransfer";
import { PermissionProvider } from "@/providers/PermissionProvider";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExecutePage() {
  const searchParams = useSearchParams();
  const nodeId = searchParams.get('nodeId') || 'erc4337-1';
  const recipient = searchParams.get('recipient') || '';
  const amount = searchParams.get('amount') || '0.001';
  const tokenAddress = searchParams.get('token') || undefined;

  const { smartAccount, address, isCreating, error } = useSmartAccount(nodeId);

  if (isCreating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <h2 className="text-xl font-semibold">Creating Smart Account...</h2>
          <p className="text-gray-600">Please wait while we initialize your ERC-4337 smart account</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-red-50 dark:bg-red-900/30 border-2 border-red-200 dark:border-red-600 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Error</h2>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <Link href="/">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!smartAccount || !address) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Smart Account Not Found
          </h2>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            Please create a smart account first by dragging an ERC-4337 node to the workflow canvas.
          </p>
          <Link href="/">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workflow
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PermissionProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link href="/">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Workflow
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Execute Transfer</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Use your ERC-4337 smart account to execute gasless transactions
            </p>
          </div>

          <SmartAccountTransfer
            smartAccount={smartAccount}
            smartAccountAddress={address}
            recipient={recipient}
            amount={amount}
            tokenAddress={tokenAddress}
          />
        </div>
      </div>
    </PermissionProvider>
  );
}
