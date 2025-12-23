import type React from "react"
import { Handle, Position } from "reactflow"
import { BarChart3 } from "lucide-react"

interface WalletAnalyticsNodeData {
  label: string
  address?: string
  metric?: "portfolio" | "transactions" | "profit-loss" | "activity"
  timeframe?: string
  value?: string
}

export function WalletAnalyticsNode({ data }: { data: WalletAnalyticsNodeData }) {
  return (
    <div className="bg-white border-2 border-indigo-300 rounded-lg p-4 shadow-md min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="h-5 w-5 text-indigo-600" />
        <span className="font-semibold text-indigo-900">{data.label || "Wallet Analytics"}</span>
      </div>
      
      <div className="space-y-1 text-xs">
        {data.metric && (
          <div className="text-gray-600 font-medium">
            Metric: {data.metric}
          </div>
        )}
        {data.address && (
          <div className="text-gray-500">
            Wallet: {data.address.slice(0, 8)}...{data.address.slice(-6)}
          </div>
        )}
        {data.timeframe && (
          <div className="text-gray-500">Timeframe: {data.timeframe}</div>
        )}
        {data.value && (
          <div className="font-medium text-indigo-700">
            Result: {data.value}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-indigo-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-indigo-400 border-2 border-white"
      />
    </div>
  )
}