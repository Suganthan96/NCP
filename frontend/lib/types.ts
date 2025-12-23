import type { Node, Edge } from "reactflow"

export interface NodeData {
  label: string
  description?: string
  required?: boolean

  // Input node properties
  dataSource?: "manual" | "api" | "database" | "file"
  sampleData?: string

  // Output node properties
  outputType?: "console" | "api" | "database" | "file"
  outputFormat?: "json" | "csv" | "xml" | "text"

  // Process node properties
  processType?: "transform" | "filter" | "aggregate" | "sort"
  processConfig?: string

  // Conditional node properties
  condition?: string
  trueLabel?: string
  falseLabel?: string

  // Code node properties
  codeLanguage?: "javascript" | "typescript"
  code?: string

  // ERC-4337 node properties
  accountAddress?: string
  bundlerUrl?: string
  paymasterUrl?: string
  status?: "connected" | "not_connected" | "error"

  // Wallet balance node properties
  balance?: string
  currency?: string
  usdValue?: string
  lastUpdated?: Date | null

  // ERC-20 tokens node properties
  tokenList?: any[]
  contractAddress?: string
  tokenSymbol?: string
  tokenBalance?: string

  // ERC-721 NFT node properties
  nftCollection?: string
  tokenId?: string
  metadata?: any
  ownerAddress?: string

  // Fetch price node properties
  tokenAddress?: string
  priceUsd?: string
  priceChange24h?: string
  lastFetched?: Date | null

  // Wallet analytics node properties
  totalTransactions?: number
  totalValue?: string
  topTokens?: any[]
  analytics?: any

  // Transfer node properties
  toAddress?: string
  amount?: string
  tokenType?: string
  gasLimit?: string
  txHash?: string

  // Swap node properties
  fromToken?: string
  toToken?: string
  fromAmount?: string
  toAmount?: string
  slippage?: string
  dexProtocol?: string
}

export type WorkflowNode = Node<NodeData>

export interface Workflow {
  nodes: WorkflowNode[]
  edges: Edge[]
}

// Agent interface for the agents page
export interface Agent {
  id: string
  name: string
  description: string
  workflow: Workflow
  nodeCount: number
  createdAt: Date
  lastModified: Date
  status: "draft" | "active" | "paused"
  walletAddress?: string
}
