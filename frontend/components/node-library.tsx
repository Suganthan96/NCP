"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { 
  Database, 
  FileOutput, 
  GitBranch, 
  Code, 
  Settings, 
  Mail, 
  Filter, 
  Workflow, 
  Table,
  Wallet,
  Coins,
  Image,
  TrendingUp,
  BarChart3,
  Send,
  ArrowLeftRight,
  Shield
} from "lucide-react"

const nodeTypes = [
  {
    type: "erc4337",
    label: "ERC-4337",
    description: "Smart Account Operations",
    icon: <Shield className="h-4 w-4 mr-2" />,
    category: "Account Abstraction"
  },
  {
    type: "wallet-balance",
    label: "Wallet Balance",
    description: "Get wallet balance",
    icon: <Wallet className="h-4 w-4 mr-2" />,
    category: "Wallet"
  },
  {
    type: "erc20-tokens",
    label: "ERC-20 Tokens",
    description: "Handle ERC-20 tokens",
    icon: <Coins className="h-4 w-4 mr-2" />,
    category: "Tokens"
  },
  {
    type: "erc721-nft",
    label: "ERC-721 (NFT)",
    description: "NFT operations",
    icon: <Image className="h-4 w-4 mr-2" />,
    category: "NFT"
  },
  {
    type: "fetch-price",
    label: "Fetch Price",
    description: "Get token prices",
    icon: <TrendingUp className="h-4 w-4 mr-2" />,
    category: "DeFi"
  },
  {
    type: "wallet-analytics",
    label: "Wallet Analytics",
    description: "Analyze wallet data",
    icon: <BarChart3 className="h-4 w-4 mr-2" />,
    category: "Analytics"
  },
  {
    type: "transfer",
    label: "Transfer",
    description: "Transfer assets",
    icon: <Send className="h-4 w-4 mr-2" />,
    category: "Transactions"
  },
  {
    type: "swap",
    label: "Swap",
    description: "Swap tokens",
    icon: <ArrowLeftRight className="h-4 w-4 mr-2" />,
    category: "DeFi"
  },
]

export default function NodeLibrary() {
  const onDragStart = (event: React.DragEvent<HTMLButtonElement>, nodeType: string) => {
    console.log("Drag started for node type:", nodeType)
    event.dataTransfer.setData("application/reactflow", nodeType)
    event.dataTransfer.effectAllowed = "move"
    console.log("Data transfer set successfully")
  }

  // Group nodes by category
  const categories = nodeTypes.reduce((acc, node) => {
    if (!acc[node.category]) {
      acc[node.category] = []
    }
    acc[node.category].push(node)
    return acc
  }, {} as Record<string, typeof nodeTypes>)

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(categories).map(([category, nodes]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 px-1">{category}</h3>
          <div className="flex flex-col gap-2">
            {nodes.map((node) => (
              <Button
                key={node.type}
                variant="outline"
                className="justify-start text-left h-auto py-3"
                draggable
                onDragStart={(e) => onDragStart(e, node.type)}
              >
                {node.icon}
                <div className="flex flex-col items-start">
                  <span className="font-medium">{node.label}</span>
                  <span className="text-xs text-gray-500">{node.description}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-4 text-xs text-gray-500 p-2 bg-gray-50 rounded">
        Drag and drop nodes onto the canvas to build your Web3 workflow
      </div>
    </div>
  )
}
