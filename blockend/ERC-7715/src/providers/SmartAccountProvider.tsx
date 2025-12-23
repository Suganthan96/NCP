"use client";

import {
  Implementation,
  MetaMaskSmartAccount,
  toMetaMaskSmartAccount,
} from "@metamask/smart-accounts-kit";
import { createContext, useState, useContext } from "react";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { usePublicClient } from "wagmi";

interface SmartAccountContext {
  smartAccount: MetaMaskSmartAccount | null,
  createSmartAccount: () => Promise<void>,
  isLoading: boolean,
  error: string | null,
}

export const SmartAccountContext = createContext<SmartAccountContext>({
  smartAccount: null,
  createSmartAccount: async () => { },
  isLoading: false,
  error: null,
});

export const SmartAccountProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [smartAccount, setSmartAccount] = useState<MetaMaskSmartAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  const createSmartAccount = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!publicClient) {
        throw new Error("Public client not found");
      }

      const account = privateKeyToAccount(generatePrivateKey());

      const newSmartAccount = await toMetaMaskSmartAccount({
        client: publicClient,
        implementation: Implementation.Hybrid,
        deployParams: [account.address, [], [], []],
        deploySalt: "0x",
        signer: { account },
      });

      setSmartAccount(newSmartAccount);
    } catch (err) {
      console.error("Error creating a smart account:", err);
      setError(err instanceof Error ? err.message : "Failed to create a smart account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SmartAccountContext.Provider
      value={{
        smartAccount,
        createSmartAccount,
        isLoading,
        error,
      }}
    >
      {children}
    </SmartAccountContext.Provider>
  );
};

export const useSmartAccountProvider = () => {
  return useContext(SmartAccountContext);
};