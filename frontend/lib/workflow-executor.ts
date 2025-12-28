import type { WorkflowNode, Workflow } from "./types"
import type { Edge } from "reactflow"

/**
 * Analyzes the workflow graph to determine execution context
 * Identifies chains like: ERC4337 -> ERC20 -> Transfer or ERC4337 -> ERC721 -> Transfer
 */
export interface ExecutionContext {
  smartAccountNode?: WorkflowNode
  tokenNode?: WorkflowNode
  nativeTokenNode?: WorkflowNode
  transferNode?: WorkflowNode
  operationType: 'erc20-transfer' | 'eth-transfer' | 'unknown'
  smartAccountAddress?: string
  permissionParams?: PermissionParameters
}

/**
 * Permission parameters extracted from workflow nodes
 */
export interface PermissionParameters {
  startTime?: string
  endTime?: string
  amountLimit?: string
  tokenAddress?: string
  periodAmount?: string
  periodDuration?: number
  decimals?: number
  symbol?: string
}

/**
 * Finds parent nodes connected to a given node
 */
export function findParentNodes(nodeId: string, edges: Edge[]): string[] {
  return edges
    .filter(edge => edge.target === nodeId)
    .map(edge => edge.source)
}

/**
 * Finds child nodes connected from a given node
 */
export function findChildNodes(nodeId: string, edges: Edge[]): string[] {
  return edges
    .filter(edge => edge.source === nodeId)
    .map(edge => edge.target)
}

/**
 * Traverses the workflow graph to find execution context for a transfer node
 */
export function analyzeTransferContext(
  transferNodeId: string,
  nodes: WorkflowNode[],
  edges: Edge[]
): ExecutionContext {
  const transferNode = nodes.find(n => n.id === transferNodeId)
  if (!transferNode) {
    return { operationType: 'unknown' }
  }

  // Find all parent nodes recursively
  const visitedNodes = new Set<string>()
  const parentChain: WorkflowNode[] = []

  function traverseParents(nodeId: string) {
    if (visitedNodes.has(nodeId)) return
    visitedNodes.add(nodeId)

    const parentIds = findParentNodes(nodeId, edges)
    for (const parentId of parentIds) {
      const parentNode = nodes.find(n => n.id === parentId)
      if (parentNode) {
        parentChain.push(parentNode)
        traverseParents(parentId)
      }
    }
  }

  traverseParents(transferNodeId)

  // Identify key nodes in the chain
  const smartAccountNode = parentChain.find(n => n.type === 'erc4337')
  const tokenNode = parentChain.find(n => n.type === 'erc20-tokens')
  const nativeTokenNode = parentChain.find(n => n.type === 'native-token')

  // Extract permission parameters from token node or native token node
  let permissionParams: PermissionParameters | undefined

  if (tokenNode) {
    const tokenData = tokenNode.data as any
    permissionParams = {
      startTime: tokenData.startTime,
      endTime: tokenData.endTime,
      amountLimit: tokenData.amountLimit,
      tokenAddress: tokenData.tokenAddress,
      periodAmount: tokenData.amount,
      decimals: tokenData.decimals || 18, // Default to 18 if not set
      symbol: tokenData.symbol,
      // Calculate period duration from start/end time if available
      periodDuration: tokenData.startTime && tokenData.endTime 
        ? (new Date(tokenData.endTime).getTime() - new Date(tokenData.startTime).getTime()) / 1000 
        : 86400 // Default to 1 day
    }
  } else if (nativeTokenNode) {
    const nativeData = nativeTokenNode.data as any
    permissionParams = {
      startTime: nativeData.startTime,
      endTime: nativeData.endTime,
      amountLimit: nativeData.amountLimit,
      periodAmount: nativeData.amount,
      decimals: 18, // ETH always uses 18 decimals
      symbol: 'ETH',
      // Calculate period duration from start/end time if available
      periodDuration: nativeData.startTime && nativeData.endTime 
        ? (new Date(nativeData.endTime).getTime() - new Date(nativeData.startTime).getTime()) / 1000 
        : 86400 // Default to 1 day
    }
  }

  // Determine operation type
  let operationType: ExecutionContext['operationType'] = 'unknown'
  
  if (smartAccountNode && tokenNode) {
    operationType = 'erc20-transfer'
  } else if (smartAccountNode && nativeTokenNode) {
    operationType = 'eth-transfer'
  } else if (smartAccountNode) {
    operationType = 'eth-transfer'
  }

  return {
    smartAccountNode,
    tokenNode,
    nativeTokenNode,
    transferNode,
    operationType,
    smartAccountAddress: (smartAccountNode?.data as any)?.smartAccountAddress as string | undefined,
    permissionParams
  }
}

/**
 * Converts workflow structure to agent-compatible format with execution context
 */
export function convertWorkflowToAgentFormat(workflow: Workflow): any {
  const { nodes, edges } = workflow
  
  // Find all transfer nodes
  const transferNodes = nodes.filter(n => n.type === 'transfer')
  
  // Analyze execution contexts
  const executionContexts = transferNodes.map(transferNode => 
    analyzeTransferContext(transferNode.id, nodes, edges)
  )

  // Build tool execution map
  const tools = nodes.map(node => {
    const childNodes = findChildNodes(node.id, edges)
    const context = executionContexts.find(ctx => 
      ctx.smartAccountNode?.id === node.id ||
      ctx.tokenNode?.id === node.id ||
      ctx.nftNode?.id === node.id ||
      ctx.transferNode?.id === node.id
    )

    return {
      node_id: node.id,
      node_type: node.type,
      node_label: node.data.label,
      node_data: node.data,
      connected_to: childNodes,
      execution_context: context
    }
  })

  return {
    tools,
    execution_contexts: executionContexts,
    edges
  }
}

/**
 * Enriches user message with workflow execution context
 */
export function enrichMessageWithContext(
  userMessage: string,
  workflow: Workflow
): string {
  const { nodes, edges } = workflow
  
  // Check if message is about transfer
  const isTransferQuery = /transfer|send|move/i.test(userMessage)
  
  if (!isTransferQuery) {
    return userMessage
  }

  // Find transfer nodes and their contexts
  const transferNodes = nodes.filter(n => n.type === 'transfer')
  
  if (transferNodes.length === 0) {
    return userMessage
  }

  // Analyze contexts
  const contexts = transferNodes.map(transferNode => 
    analyzeTransferContext(transferNode.id, nodes, edges)
  )

  // Build enriched message
  const enrichedParts = [userMessage, '\n\nWORKFLOW CONTEXT:']

  contexts.forEach((context, index) => {
    if (context.operationType !== 'unknown') {
      enrichedParts.push(
        `\n[Transfer Node ${index + 1}]`,
        `Type: ${context.operationType}`,
      )

      if (context.smartAccountNode) {
        enrichedParts.push(
          `Smart Account: ${context.smartAccountAddress || 'Not created'}`
        )
      }

      if (context.tokenNode) {
        const tokenData = context.tokenNode.data as any;
        enrichedParts.push(
          `Token: ${tokenData.symbol || 'Unknown'} (${tokenData.tokenAddress || 'N/A'})`
        )
      }

      if (context.nftNode) {
        const nftData = context.nftNode.data as any;
        enrichedParts.push(
          `NFT Collection: ${nftData.collection || 'Unknown'} (${nftData.contractAddress || 'N/A'})`
        )
      }

      if (context.transferNode) {
        const transferData = context.transferNode.data as any;
        enrichedParts.push(
          `Recipient: ${transferData.to || 'Not specified'}`,
          `Amount: ${transferData.amount || 'Not specified'}`
        )
      }
    }
  })

  return enrichedParts.join('\n')
}

/**
 * Generates execution plan for the agent
 */
export function generateExecutionPlan(workflow: Workflow): any {
  const { nodes, edges } = workflow
  
  // Find all transfer nodes and analyze their contexts
  const transferNodes = nodes.filter(n => n.type === 'transfer')
  const executionSteps: any[] = []

  transferNodes.forEach((transferNode, index) => {
    const context = analyzeTransferContext(transferNode.id, nodes, edges)
    
    if (context.operationType === 'erc20-transfer' && context.smartAccountNode && context.tokenNode) {
      const tokenData = context.tokenNode.data as any;
      const transferData = transferNode.data as any;
      executionSteps.push({
        step: index + 1,
        operation: 'erc20_transfer',
        smart_account: context.smartAccountAddress,
        token_address: tokenData.tokenAddress,
        token_symbol: tokenData.symbol,
        recipient: transferData.to,
        amount: transferData.amount,
        description: `Transfer ${transferData.amount || 'X'} ${tokenData.symbol || 'tokens'} to ${transferData.to} using smart account ${context.smartAccountAddress}`
      })
    } else if (context.operationType === 'nft-transfer' && context.smartAccountNode && context.nftNode) {
      const nftData = context.nftNode.data as any;
      const transferData = transferNode.data as any;
      executionSteps.push({
        step: index + 1,
        operation: 'nft_transfer',
        smart_account: context.smartAccountAddress,
        nft_contract: nftData.contractAddress,
        nft_collection: nftData.collection,
        token_id: nftData.tokenId,
        recipient: transferData.to,
        description: `Transfer NFT #${nftData.tokenId || 'X'} from ${nftData.collection || 'collection'} to ${transferData.to} using smart account ${context.smartAccountAddress}`
      })
    } else if (context.operationType === 'eth-transfer' && context.smartAccountNode) {
      const transferData = transferNode.data as any;
      executionSteps.push({
        step: index + 1,
        operation: 'eth_transfer',
        smart_account: context.smartAccountAddress,
        recipient: transferData.to,
        amount: transferData.amount,
        description: `Transfer ${transferData.amount || 'X'} ETH to ${transferData.to} using smart account ${context.smartAccountAddress}`
      })
    }
  })

  return {
    has_executable_steps: executionSteps.length > 0,
    total_steps: executionSteps.length,
    execution_steps: executionSteps
  }
}
