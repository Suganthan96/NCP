import type React from "react"
import { Handle, Position } from "reactflow"
import { Send } from "lucide-react"

interface TransferNodeData {
  label: string
  from?: string
  to?: string
  amount?: string
  asset?: string
  network?: string
  status?: "pending" | "confirmed" | "failed"
}

export function TransferNode({ data }: { data: TransferNodeData }) {
  return (
    <div className="bg-white border-2 border-red-300 rounded-lg p-4 shadow-md min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Send className="h-5 w-5 text-red-600" />
        <span className="font-semibold text-red-900">{data.label || "Transfer"}</span>
      </div>
      
      <div className="space-y-1 text-xs">
        {data.from && (
          <div className="text-gray-500">
            From: {data.from.slice(0, 8)}...{data.from.slice(-6)}
          </div>
        )}
        {data.to && (
          <div className="text-gray-500">
            To: {data.to.slice(0, 8)}...{data.to.slice(-6)}
          </div>
        )}
        {data.amount && data.asset && (
          <div className="font-medium text-red-700">
            Amount: {data.amount} {data.asset}
          </div>
        )}
        {data.network && (
          <div className="text-gray-500">Network: {data.network}</div>
        )}
        {data.status && (
          <div className={`font-medium ${
            data.status === 'confirmed' ? 'text-green-600' :
            data.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            Status: {data.status}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-red-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-red-400 border-2 border-white"
      />
    </div>
  )
}