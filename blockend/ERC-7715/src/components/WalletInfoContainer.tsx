"use client";

import { useSmartAccountProvider } from "@/providers/SmartAccountProvider";
import WalletInfo from "@/components/WalletInfo";
import { useAccount } from "wagmi";

export default function WalletInfoContainer() {
  const { smartAccount } = useSmartAccountProvider();
  const { address } = useAccount();

  return (
    <div className="w-full max-w-4xl mx-auto p-3 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {smartAccount && (
          <WalletInfo
            address={smartAccount.address}
            label="Smart Account"
          />
        )}
        {address && (
          <WalletInfo address={address} label="Connected Account" />
        )}
      </div>
    </div>
  );
}