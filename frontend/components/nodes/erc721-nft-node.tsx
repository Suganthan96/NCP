import type React from "react"
import { Handle, Position } from "reactflow"
import { Image } from "lucide-react"

interface ERC721NodeData {
  label: string
  contractAddress?: string
  operation?: "balance" | "transfer" | "mint" | "burn" | "metadata"
  tokenId?: string
  collection?: string
  startTime?: string
  endTime?: string
  maxTransfers?: number
}

export function ERC721NFTNode({ data }: { data: ERC721NodeData }) {
  return (
    <div className="bg-white border-2 border-purple-300 rounded-lg p-4 shadow-md min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Image className="h-5 w-5 text-purple-600" />
        <span className="font-semibold text-purple-900">{data.label || "ERC-721 (NFT)"}</span>
      </div>
      
      <div className="space-y-1 text-xs">
        {data.operation && (
          <div className="text-gray-600 font-medium">
            Operation: {data.operation}
          </div>
        )}
        {data.contractAddress && (
          <div className="text-gray-500">
            Contract: {data.contractAddress.slice(0, 8)}...{data.contractAddress.slice(-6)}
          </div>
        )}
        {data.collection && (
          <div className="text-gray-500">Collection: {data.collection}</div>
        )}
        {data.tokenId && (
          <div className="font-medium text-purple-700">
            Token ID: #{data.tokenId}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-400 border-2 border-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-400 border-2 border-white"
      />
    </div>
  )
}