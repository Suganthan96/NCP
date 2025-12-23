import type React from "react"
import { Handle, Position } from "reactflow"
import { ArrowLeftRight } from "lucide-react"

interface SwapNodeData {
  label: string
  fromToken?: string
  toToken?: string
  fromAmount?: string
  toAmount?: string
  protocol?: "uniswap" | "1inch" | "sushiswap"
  slippage?: string
}

export function SwapNode({ data }: { data: SwapNodeData }) {
  return (
    <div className="bg-white border-2 border-teal-300 rounded-lg p-4 shadow-md min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <ArrowLeftRight className="h-5 w-5 text-teal-600" />
        <span className="font-semibold text-teal-900">{data.label || "Swap"}</span>
      </div>
      
      <div className="space-y-1 text-xs">
        {data.fromToken && data.fromAmount && (
          <div className="text-gray-600">
            From: {data.fromAmount} {data.fromToken}
          </div>
        )}
        {data.toToken && data.toAmount && (
          <div className="text-gray-600">
            To: {data.toAmount} {data.toToken}
          </div>
        )}
        {data.protocol && (
          <div className="text-gray-500">Protocol: {data.protocol}</div>
        )}
        {data.slippage && (
          <div className="text-gray-500">Slippage: {data.slippage}%</div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-teal-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-teal-400 border-2 border-white"
      />
    </div>
  )
}