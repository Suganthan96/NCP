import type { Agent, Workflow } from "./types"

const AGENTS_STORAGE_KEY = "savedAgents"

// Generate a unique agent ID
export const generateAgentId = (): string => {
  return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Save an agent to localStorage
export const saveAgent = (agent: Omit<Agent, "id" | "createdAt" | "lastModified">): Agent => {
  const newAgent: Agent = {
    ...agent,
    id: generateAgentId(),
    createdAt: new Date(),
    lastModified: new Date(),
  }

  const existingAgents = getAgents()
  const updatedAgents = [...existingAgents, newAgent]
  
  localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(updatedAgents))
  
  return newAgent
}

// Update an existing agent
export const updateAgent = (agentId: string, updates: Partial<Agent>): Agent | null => {
  const agents = getAgents()
  const agentIndex = agents.findIndex(a => a.id === agentId)
  
  if (agentIndex === -1) {
    return null
  }

  const updatedAgent = {
    ...agents[agentIndex],
    ...updates,
    lastModified: new Date(),
  }

  agents[agentIndex] = updatedAgent
  localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents))
  
  return updatedAgent
}

// Get all saved agents
export const getAgents = (): Agent[] => {
  try {
    const saved = localStorage.getItem(AGENTS_STORAGE_KEY)
    if (!saved) return []
    
    const agents = JSON.parse(saved)
    // Convert date strings back to Date objects
    return agents.map((agent: any) => ({
      ...agent,
      createdAt: new Date(agent.createdAt),
      lastModified: new Date(agent.lastModified),
    }))
  } catch (error) {
    console.error("Error loading agents:", error)
    return []
  }
}

// Delete an agent
export const deleteAgent = (agentId: string): boolean => {
  const agents = getAgents()
  const filteredAgents = agents.filter(a => a.id !== agentId)
  
  if (filteredAgents.length === agents.length) {
    return false // Agent not found
  }
  
  localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(filteredAgents))
  return true
}

// Duplicate an agent
export const duplicateAgent = (agentId: string): Agent | null => {
  const agents = getAgents()
  const originalAgent = agents.find(a => a.id === agentId)
  
  if (!originalAgent) {
    return null
  }

  const duplicatedAgent: Agent = {
    ...originalAgent,
    id: generateAgentId(),
    name: `${originalAgent.name} (Copy)`,
    createdAt: new Date(),
    lastModified: new Date(),
    status: "draft"
  }

  const updatedAgents = [...agents, duplicatedAgent]
  localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(updatedAgents))
  
  return duplicatedAgent
}

// Generate agent name from workflow
export const generateAgentName = (workflow: Workflow): string => {
  const nodeCount = workflow.nodes.length
  const hasAgent = workflow.nodes.some(node => node.data.label === "Agent")
  
  if (hasAgent && nodeCount === 1) {
    return "Simple Agent"
  }
  
  const nodeTypes = [...new Set(workflow.nodes.map(node => node.type))]
  
  if (nodeTypes.includes("wallet-balance") && nodeTypes.includes("transfer")) {
    return "Wallet Manager Agent"
  } else if (nodeTypes.includes("erc20-tokens") && nodeTypes.includes("swap")) {
    return "Token Trading Agent"
  } else if (nodeTypes.includes("erc721-nft")) {
    return "NFT Agent"
  } else if (nodeTypes.includes("fetch-price")) {
    return "Price Monitor Agent"
  } else if (nodeTypes.includes("wallet-analytics")) {
    return "Analytics Agent"
  }
  
  return `Web3 Agent (${nodeCount} nodes)`
}

// Generate agent description from workflow
export const generateAgentDescription = (workflow: Workflow): string => {
  const nodeCount = workflow.nodes.length
  const nodeTypes = [...new Set(workflow.nodes.map(node => node.type))]
  
  if (nodeCount === 1 && workflow.nodes[0]?.data.label === "Agent") {
    return "A basic AI agent ready for Web3 operations"
  }
  
  const operations = []
  
  if (nodeTypes.includes("wallet-balance")) operations.push("wallet monitoring")
  if (nodeTypes.includes("transfer")) operations.push("asset transfers")
  if (nodeTypes.includes("erc20-tokens")) operations.push("token management")
  if (nodeTypes.includes("erc721-nft")) operations.push("NFT operations")
  if (nodeTypes.includes("swap")) operations.push("token swapping")
  if (nodeTypes.includes("fetch-price")) operations.push("price monitoring")
  if (nodeTypes.includes("wallet-analytics")) operations.push("analytics")
  
  if (operations.length === 0) {
    return `Automated workflow with ${nodeCount} connected operations`
  }
  
  const operationsText = operations.slice(0, 3).join(", ")
  const moreText = operations.length > 3 ? ` and ${operations.length - 3} more` : ""
  
  return `Automates ${operationsText}${moreText} using ${nodeCount} connected nodes`
}