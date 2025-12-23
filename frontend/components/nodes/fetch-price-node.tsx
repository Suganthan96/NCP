import type React from "react"
import { Handle, Position } from "reactflow"
import { TrendingUp } from "lucide-react"

interface FetchPriceNodeData {
  label: string
  token?: string
  vs_currency?: string
  price?: string
  source?: "coingecko" | "coinbase" | "binance"
}

export function FetchPriceNode({ data }: { data: FetchPriceNodeData }) {
  return (
    <div className="bg-white border-2 border-orange-300 rounded-lg p-4 shadow-md min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-5 w-5 text-orange-600" />
        <span className="font-semibold text-orange-900">{data.label || "Fetch Price"}</span>
      </div>
      
      <div className="space-y-1 text-xs">
        {data.token && (
          <div className="text-gray-600 font-medium">
            Token: {data.token.toUpperCase()}
          </div>
        )}
        {data.vs_currency && (
          <div className="text-gray-500">
            Currency: {data.vs_currency.toUpperCase()}
          </div>
        )}
        {data.source && (
          <div className="text-gray-500">Source: {data.source}</div>
        )}
        {data.price && (
          <div className="font-medium text-orange-700">
            Price: ${data.price}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-orange-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-400 border-2 border-white"
      />
    </div>
  )
}