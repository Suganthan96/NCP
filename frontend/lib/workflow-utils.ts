import type { Node, XYPosition } from "reactflow"
import type { NodeData } from "./types"

let nodeIdCounter = 0

export const generateNodeId = (type: string): string => {
  nodeIdCounter++
  return `${type}-${nodeIdCounter}`
}

export const createNode = ({
  type,
  position,
  id,
}: {
  type: string
  position: XYPosition
  id: string
}): Node<NodeData> => {
  const baseNode = {
    id,
    type,
    position,
    data: {
      label: getDefaultLabel(type),
      description: getDefaultDescription(type),
    },
  }

  switch (type) {
    case "input":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          dataSource: "manual",
          sampleData: '{"example": "data"}',
        },
      }
    case "output":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          outputType: "console",
          outputFormat: "json",
        },
      }
    case "process":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          processType: "transform",
          processConfig: '{"operation": "map"}',
        },
      }
    case "conditional":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          condition: "data.value > 0",
          trueLabel: "Yes",
          falseLabel: "No",
        },
      }
    case "code":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          codeLanguage: "javascript",
          code: "// Write your code here\nfunction process(data) {\n  // Transform data\n  return data;\n}",
        },
      }
    case "erc4337":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          accountAddress: "",
          bundlerUrl: "",
          paymasterUrl: "",
          status: "not_connected",
        },
      }
    case "wallet-balance":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          balance: "0",
          currency: "ETH",
          usdValue: "0",
          lastUpdated: null,
        },
      }
    case "erc20-tokens":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          tokenList: [],
          contractAddress: "",
          tokenSymbol: "",
          tokenBalance: "0",
        },
      }
    case "erc721-nft":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          nftCollection: "",
          tokenId: "",
          metadata: {},
          ownerAddress: "",
        },
      }
    case "fetch-price":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          tokenAddress: "",
          priceUsd: "0",
          priceChange24h: "0",
          lastFetched: null,
        },
      }
    case "wallet-analytics":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          totalTransactions: 0,
          totalValue: "0",
          topTokens: [],
          analytics: {},
        },
      }
    case "transfer":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          toAddress: "",
          amount: "0",
          tokenType: "ETH",
          gasLimit: "21000",
          txHash: "",
        },
      }
    case "swap":
      return {
        ...baseNode,
        data: {
          ...baseNode.data,
          fromToken: "ETH",
          toToken: "",
          fromAmount: "0",
          toAmount: "0",
          slippage: "0.5",
          dexProtocol: "uniswap",
        },
      }
    default:
      return baseNode
  }
}

const getDefaultLabel = (type: string): string => {
  switch (type) {
    case "input":
      return "Input"
    case "output":
      return "Output"
    case "process":
      return "Process"
    case "conditional":
      return "Conditional"
    case "code":
      return "Code"
    case "erc4337":
      return "ERC-4337 Account"
    case "wallet-balance":
      return "Wallet Balance"
    case "erc20-tokens":
      return "ERC-20 Tokens"
    case "erc721-nft":
      return "ERC-721 NFTs"
    case "fetch-price":
      return "Fetch Price"
    case "wallet-analytics":
      return "Wallet Analytics"
    case "transfer":
      return "Transfer"
    case "swap":
      return "Swap"
    default:
      return "Node"
  }
}

const getDefaultDescription = (type: string): string => {
  switch (type) {
    case "input":
      return "Data input node"
    case "output":
      return "Data output node"
    case "process":
      return "Data processing node"
    case "conditional":
      return "Conditional branching"
    case "code":
      return "Custom code execution"
    case "erc4337":
      return "ERC-4337 smart account management"
    case "wallet-balance":
      return "Check wallet balance and value"
    case "erc20-tokens":
      return "Manage ERC-20 token interactions"
    case "erc721-nft":
      return "Handle NFT operations"
    case "fetch-price":
      return "Get real-time token prices"
    case "wallet-analytics":
      return "Analyze wallet transaction history"
    case "transfer":
      return "Transfer tokens or ETH"
    case "swap":
      return "Swap tokens via DEX"
    default:
      return "Workflow node"
  }
}
