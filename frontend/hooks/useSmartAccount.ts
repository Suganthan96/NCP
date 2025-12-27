"use client";

import {
  Implementation,
  MetaMaskSmartAccount,
  toMetaMaskSmartAccount,
} from "@metamask/smart-accounts-kit";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { keccak256, toHex } from "viem";

interface SmartAccountData {
  smartAccount: MetaMaskSmartAccount | null;
  address: string | null;
  isCreating: boolean;
  error: string | null;
}

/**
 * Hook to create and manage ERC-4337 smart accounts for nodes
 * Each node can have its own smart account with specific permissions
 */
export function useSmartAccount(nodeId: string) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [accountData, setAccountData] = useState<SmartAccountData>({
    smartAccount: null,
    address: null,
    isCreating: false,
    error: null,
  });

  // Store smart accounts per node in localStorage
  const getStoredAccount = (nodeId: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`smartAccount_${nodeId}`);
  };

  const setStoredAccount = (nodeId: string, address: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`smartAccount_${nodeId}`, address);
  };

  const createSmartAccount = async () => {
    if (!userAddress || !walletClient || !publicClient) {
      setAccountData(prev => ({
        ...prev,
        error: "Wallet not connected. Please connect your wallet first.",
      }));
      return;
    }

    setAccountData(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      console.log(`Creating smart account for node: ${nodeId}`);

      // Generate a proper 32-byte salt from the node ID using keccak256
      const salt = keccak256(toHex(nodeId));
      console.log(`Generated salt: ${salt}`);

      // Create smart account using user's wallet as signer
      const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [userAddress, [], [], []],
        deploySalt: salt, // Use keccak256 hash as salt (exactly 32 bytes)
        signer: { walletClient },
      });

      const accountAddress = smartAccount.address;
      console.log(`✅ Smart account created successfully!`);
      console.log(`Node ID: ${nodeId}`);
      console.log(`Smart Account Address: ${accountAddress}`);
      console.log(`User Wallet Address (signer): ${userAddress}`);
      console.log(`These should be DIFFERENT addresses!`);

      // Store the account address for this node
      setStoredAccount(nodeId, accountAddress);

      setAccountData({
        smartAccount,
        address: accountAddress,
        isCreating: false,
        error: null,
      });

      return smartAccount;
    } catch (error) {
      console.error("Error creating smart account:", error);
      setAccountData(prev => ({
        ...prev,
        isCreating: false,
        error: error instanceof Error ? error.message : "Failed to create smart account",
      }));
    }
  };

  // Auto-create smart account on mount if not exists
  useEffect(() => {
    // Skip smart account creation for the agent-default node
    // This is just a visual representation, not an actual smart account node
    if (nodeId === 'agent-default') {
      console.log(`ℹ️ Skipping smart account creation for agent-default node`);
      return;
    }
    
    const storedAddress = getStoredAccount(nodeId);
    
    console.log(`useSmartAccount hook for node: ${nodeId}`);
    console.log(`Stored address from localStorage: ${storedAddress}`);
    console.log(`User wallet address: ${userAddress}`);
    
    // Check if stored address is actually the user's wallet (wrong!)
    if (storedAddress && userAddress && storedAddress.toLowerCase() === userAddress.toLowerCase()) {
      console.error(`❌ ERROR: Stored address is wallet address, not smart account! Clearing and recreating...`);
      localStorage.removeItem(`smartAccount_${nodeId}`);
      // Force recreate
      if (walletClient && publicClient && !accountData.isCreating) {
        createSmartAccount();
      }
      return;
    }
    
    if (storedAddress) {
      // Account already exists, just set the address
      console.log(`Using existing smart account: ${storedAddress}`);
      setAccountData(prev => ({
        ...prev,
        address: storedAddress,
      }));
    } else if (userAddress && walletClient && publicClient && !accountData.isCreating) {
      // Create new account if doesn't exist
      console.log(`Creating new smart account for node: ${nodeId}`);
      createSmartAccount();
    }
  }, [nodeId, userAddress, walletClient, publicClient]);

  return {
    ...accountData,
    createSmartAccount,
    refreshAccount: createSmartAccount,
  };
}

/**
 * Hook to manage smart account for delegate operations
 * Uses a private key for autonomous agent operations
 */
export function useDelegateSmartAccount(nodeId: string, delegatePrivateKey?: string) {
  const publicClient = usePublicClient();
  
  const [accountData, setAccountData] = useState<SmartAccountData>({
    smartAccount: null,
    address: null,
    isCreating: false,
    error: null,
  });

  const createDelegateAccount = async () => {
    if (!publicClient) {
      setAccountData(prev => ({
        ...prev,
        error: "Public client not available",
      }));
      return;
    }

    setAccountData(prev => ({ ...prev, isCreating: true, error: null }));

    try {
      // Generate or use provided private key for the delegate
      const privateKey = delegatePrivateKey || generatePrivateKey();
      const account = privateKeyToAccount(privateKey as `0x${string}`);

      console.log(`Creating delegate smart account for node: ${nodeId}`);

      // Generate a proper 32-byte salt from the node ID using keccak256
      const salt = keccak256(toHex(`delegate_${nodeId}`));

      const smartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [account.address, [], [], []],
        deploySalt: salt, // Use keccak256 hash as salt (exactly 32 bytes)
        signer: { account },
      });

      const accountAddress = smartAccount.address;
      console.log(`Delegate smart account created: ${accountAddress}`);

      setAccountData({
        smartAccount,
        address: accountAddress,
        isCreating: false,
        error: null,
      });

      return { smartAccount, privateKey };
    } catch (error) {
      console.error("Error creating delegate smart account:", error);
      setAccountData(prev => ({
        ...prev,
        isCreating: false,
        error: error instanceof Error ? error.message : "Failed to create delegate smart account",
      }));
    }
  };

  return {
    ...accountData,
    createDelegateAccount,
  };
}
