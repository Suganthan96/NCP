import type React from "react"
import { Handle, Position } from "reactflow"
import { Shield } from "lucide-react"

interface ERC4337NodeData {
  label: string
  operation?: "create-account" | "send-user-operation" | "estimate-gas" | "get-account-info"
  bundlerUrl?: string
  paymasterUrl?: string
}

export function ERC4337Node({ data }: { data: ERC4337NodeData }) {
  return (
    <div className="bg-white border-2 border-blue-300 rounded-lg p-4 shadow-md min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-5 w-5 text-blue-600" />
        <span className="font-semibold text-blue-900">{data.label || "ERC-4337"}</span>
      </div>
      
      <div className="text-xs text-gray-600 mb-3">
        {data.operation ? `Operation: ${data.operation}` : "Smart Account Operations"}
      </div>

      <div className="space-y-1 text-xs">
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