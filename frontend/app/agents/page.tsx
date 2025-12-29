"use client"

import { useState, useEffect } from "react"
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Settings, Trash2, Copy, ArrowLeft, AlertCircle, CheckCircle, MessageCircle } from "lucide-react"
import { useMetaMaskFlask } from "@/hooks/useMetaMaskFlask"
import { MetaMaskDebugInfo } from "@/components/MetaMaskDebugInfo"
import { getAgents, deleteAgent as deleteAgentUtil, duplicateAgent as duplicateAgentUtil, getNodeTypeSummary } from "@/lib/agents-utils"
import type { Agent } from "@/lib/types"

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { isConnected } = useAccount()
  const { isFlaskAvailable, isMetaMaskAvailable } = useMetaMaskFlask()
  const router = useRouter()

  // Load saved agents from localStorage on component mount
  useEffect(() => {
    setIsLoading(true)
    const savedAgents = getAgents()
    setAgents(savedAgents)
    setIsLoading(false)
  }, [])

  const handleDuplicateAgent = (agentId: string) => {
    const duplicatedAgent = duplicateAgentUtil(agentId)
    if (duplicatedAgent) {
      setAgents(prev => [...prev, duplicatedAgent])
    }
  }

  const handleDeleteAgent = (agentId: string) => {
    const success = deleteAgentUtil(agentId)
    if (success) {
      setAgents(prev => prev.filter(a => a.id !== agentId))
    }
  }

  const handleOpenChat = (agent: Agent) => {
    router.push(`/chat?agent=${agent.id}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50"
      case "paused":
        return "text-yellow-600 bg-yellow-50"
      case "draft":
        return "text-gray-600 bg-gray-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with wallet connection */}
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Builder
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Agents</h1>
                <p className="text-sm text-gray-500">Manage your automated workflow agents</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* MetaMask Flask Status */}
              <div className="flex items-center gap-2 text-sm">
                {isFlaskAvailable ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Flask Detected</span>
                  </div>
                ) : isMetaMaskAvailable ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>MetaMask (Regular)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>No MetaMask</span>
                  </div>
                )}
              </div>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions bar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {agents.length} {agents.length === 1 ? 'Agent' : 'Agents'}
            </h2>
          </div>
          <Link href="/">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Agent
            </Button>
          </Link>
        </div>

        {/* Agents grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto max-w-md">
              <div className="bg-gray-50 rounded-lg p-8">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
                <p className="text-gray-500 mb-6">
                  Create your first automated Web3 agent using our drag-and-drop workflow builder.
                </p>
                {isConnected ? (
                  <Link href="/">
                    <Button className="flex items-center gap-2 mx-auto">
                      <Plus className="h-4 w-4" />
                      Create Your First Agent
                    </Button>
                  </Link>
                ) : (
                  <p className="text-sm text-gray-400 mb-4">
                    Connect your wallet to start creating agents
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{agent.name}</h3>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleDuplicateAgent(agent.id)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteAgent(agent.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {agent.description}
                </p>

                {/* Node Types Display */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>{agent.nodeCount} nodes</span>
                    <span>Modified {agent.lastModified.toLocaleDateString()}</span>
                  </div>
                  
                  {/* Show specific node types */}
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {getNodeTypeSummary(agent.workflow).slice(0, 6).map((nodeType, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        title={`Contains ${nodeType} node${nodeType.includes('x') ? 's' : ''}`}
                      >
                        {nodeType}
                      </span>
                    ))}
                    {getNodeTypeSummary(agent.workflow).length > 6 && (
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200"
                        title={`And ${getNodeTypeSummary(agent.workflow).length - 6} more node types...`}
                      >
                        +{getNodeTypeSummary(agent.workflow).length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={() => handleOpenChat(agent)}
                  >
                    <MessageCircle className="h-3 w-3" />
                    Open Chat
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Debug info - remove in production */}
      <MetaMaskDebugInfo />
    </div>
  )
}
