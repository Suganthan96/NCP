"use client";

import { useSmartAccountProvider } from "@/providers/SmartAccountProvider";
import { ArrowRight } from "lucide-react";
import Button from "@/components/Button";

export default function CreateSmartAccountButton() {
  const { createSmartAccount } = useSmartAccountProvider();

  const handleCreateSmartAccount = async () => {
    await createSmartAccount();
  };

  return (
    <Button className="w-full space-x-2" onClick={handleCreateSmartAccount}>
      <span>Create Smart Account</span>
      <ArrowRight className="w-5 h-5" />
    </Button>
  );
}
