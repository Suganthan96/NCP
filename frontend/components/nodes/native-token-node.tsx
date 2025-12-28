"use client"

import { Handle, Position } from "reactflow"

interface NativeTokenNodeProps {
  data: {
    label: string
    description?: string
    amount?: string
    amountLimit?: string
    startTime?: string
    endTime?: string
  }
}

export function NativeTokenNode({ data }: NativeTokenNodeProps) {
  return (
    <div className="px-4 py-2 shadow-lg rounded-lg border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-pink-50 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-purple-500" />
      
      <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center justify-center w-6 h-6 rounded bg-purple-500 text-white text-xs font-bold">
          Ξ
        </div>
        <div className="font-semibold text-sm text-gray-800">{data.label}</div>
      </div>
      
      {data.description && (
        <div className="text-xs text-gray-500 mb-2">{data.description}</div>
      )}

      {data.amountLimit && (
        <div className="text-xs bg-purple-100 rounded px-2 py-1 mt-1">
          Limit: {data.amountLimit} ETH
        </div>
      )}
      
      {data.startTime && data.endTime && (
        <div className="text-xs text-purple-600 mt-1">
          ⏰ Time-limited
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-purple-500" />
    </div>
  )
}
