import type React from "react"
import { Handle, Position } from "reactflow"
import { Wallet } from "lucide-react"

interface WalletBalanceNodeData {
  label: string
  address?: string
  network?: string
  balance?: string
}

export function WalletBalanceNode({ data }: { data: WalletBalanceNodeData }) {
  return (
    <div className="bg-white border-2 border-green-300 rounded-lg p-4 shadow-md min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="h-5 w-5 text-green-600" />
        <span className="font-semibold text-green-900">{data.label || "Wallet Balance"}</span>
      </div>
      
      <div className="space-y-1 text-xs">
        {data.address && (
          <div className="text-gray-500">
            Address: {data.address.slice(0, 8)}...{data.address.slice(-6)}
          </div>
        )}
        {data.network && (
          <div className="text-gray-500">Network: {data.network}</div>
        )}
        {data.balance && (
          <div className="font-medium text-green-700">
            Balance: {data.balance} ETH
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-green-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-400 border-2 border-white"
      />
    </div>
  )
}