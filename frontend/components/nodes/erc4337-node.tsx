import type React from "react"
import { Handle, Position, useReactFlow } from "reactflow"
import { Shield, CheckCircle, Loader2, AlertCircle } from "lucide-react"
import { useSmartAccount } from "@/hooks/useSmartAccount"
import { useEffect } from "react"

interface ERC4337NodeData {
  label: string
  operation?: "create-account" | "send-user-operation" | "estimate-gas" | "get-account-info"
  bundlerUrl?: string
  paymasterUrl?: string
  smartAccountAddress?: string
  smartAccountStatus?: "creating" | "created" | "error"
}

export function ERC4337Node({ data, id }: { data: ERC4337NodeData; id: string }) {
  const { smartAccount, address, isCreating, error } = useSmartAccount(id);
  const { setNodes } = useReactFlow();

  // Update node data when smart account is created
  useEffect(() => {
    if (address && !data.smartAccountAddress) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                smartAccountAddress: address,
                smartAccountStatus: "created",
              },
            };
          }
          return node;
        })
      );
    } else if (error && data.smartAccountStatus !== "error") {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                smartAccountStatus: "error",
              },
            };
          }
          return node;
        })
      );
    } else if (isCreating && data.smartAccountStatus !== "creating") {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                smartAccountStatus: "creating",
              },
            };
          }
          return node;
        })
      );
    }
  }, [address, isCreating, error, id, setNodes, data.smartAccountAddress, data.smartAccountStatus]);

  const getStatusIcon = () => {
    if (isCreating) return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
    if (error) return <AlertCircle className="h-4 w-4 text-red-600" />;
    if (address) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <Shield className="h-5 w-5 text-blue-600" />;
  };

  const getStatusText = () => {
    if (isCreating) return "Creating Smart Account...";
    if (error) return "Failed to create account";
    if (address) return "Smart Account Ready";
    return "Smart Account Operations";
  };

  return (
    <div className="bg-white border-2 border-blue-300 rounded-lg p-4 shadow-md min-w-[240px]">
      <div className="flex items-center gap-2 mb-2">
        {getStatusIcon()}
        <span className="font-semibold text-blue-900">{data.label || "ERC-4337"}</span>
      </div>
      
      <div className="text-xs text-gray-600 mb-3">
        {getStatusText()}
      </div>

      <div className="space-y-1 text-xs">
        {data.operation && (
          <div className="text-gray-500">
            Operation: {data.operation}
          </div>
        )}
        {data.bundlerUrl && (
          <div className="text-gray-500">
            Bundler: {data.bundlerUrl.slice(0, 30)}...
          </div>
        )}
        {data.paymasterUrl && (
          <div className="text-gray-500">
            Paymaster: {data.paymasterUrl.slice(0, 30)}...
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-400 border-2 border-white"
      />
    </div>
  )
}