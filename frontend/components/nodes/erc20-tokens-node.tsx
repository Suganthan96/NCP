import type React from "react"
import { Handle, Position } from "reactflow"
import { Coins } from "lucide-react"

interface ERC20NodeData {
  label: string
  tokenAddress?: string
  operation?: "balance" | "transfer" | "approve" | "allowance"
  amount?: string
  symbol?: string
  startTime?: string
  endTime?: string
  amountLimit?: string
}

export function ERC20TokensNode({ data }: { data: ERC20NodeData }) {
  return (
    <div className="bg-white border-2 border-yellow-300 rounded-lg p-4 shadow-md min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Coins className="h-5 w-5 text-yellow-600" />
        <span className="font-semibold text-yellow-900">{data.label || "ERC-20 Tokens"}</span>
      </div>
      
      <div className="space-y-1 text-xs">
        {data.operation && (
          <div className="text-gray-600 font-medium">
            Operation: {data.operation}
          </div>
        )}
        {data.tokenAddress && (
          <div className="text-gray-500">
            Token: {data.tokenAddress.slice(0, 8)}...{data.tokenAddress.slice(-6)}
          </div>
        )}
        {data.symbol && (
          <div className="text-gray-500">Symbol: {data.symbol}</div>
        )}
        {data.amount && (
          <div className="font-medium text-yellow-700">
            Amount: {data.amount}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-yellow-400 border-2 border-white"
      />
    </div>
  )
}