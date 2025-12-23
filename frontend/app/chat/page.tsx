"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Send, Bot, User, Loader2 } from "lucide-react"
import { getAgents } from "@/lib/agents-utils"
import type { Agent } from "@/lib/types"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  toolCalls?: any[]
  results?: any[]
}

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const agentId = searchParams.get('agent')
  const { address, isConnected } = useAccount()
  
  const [agent, setAgent] = useState<Agent | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load agent data
  useEffect(() => {
    if (agentId) {
      const agents = getAgents()
      const foundAgent = agents.find(a => a.id === agentId)
      if (foundAgent) {
        setAgent(foundAgent)
        // Add welcome message
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Hello! I'm ${foundAgent.name}. ${foundAgent.description}

I can help you with Web3 operations like wallet management, token transfers, NFT operations, and more. What would you like to do today?`,
            timestamp: new Date()
          }
        ])
      } else {
        router.push('/agents')
      }
    } else {
      router.push('/agents')
    }
  }, [agentId, router])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // Convert agent workflow to tools format for API
  const convertWorkflowToTools = (agent: Agent) => {
    if (!agent.workflow.nodes) return []
    
    const tools: any[] = []
    const nodeConnections: { [key: string]: string } = {}
    
    // Build connections map from edges
    agent.workflow.edges?.forEach(edge => {
      nodeConnections[edge.source] = edge.target
    })
    
    // Convert nodes to tool connections
    agent.workflow.nodes.forEach(node => {
      const toolName = node.type
      const nextTool = nodeConnections[node.id]
      
      tools.push({
        tool: toolName,
        next_tool: nextTool || null
      })
    })
    
    return tools
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !agent || isLoading) return
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user", 
      content: inputMessage.trim(),
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)
    setIsTyping(true)
    
    try {
      // Prepare request for the agent API
      const agentRequest = {
        tools: convertWorkflowToTools(agent),
        user_message: inputMessage.trim(),
        private_key: address ? `demo_key_${address}` : undefined, // Using demo key for safety
        context: {
          agent_name: agent.name,
          agent_description: agent.description,
          network: "ethereum",
          user_wallet: address
        }
      }

      // Call the Groq agent API
      const response = await fetch('http://localhost:8000/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentRequest)
      })

      if (!response.ok) {
        if (response.status === 405) {
          throw new Error(`CORS or method error: ${response.status}. Make sure the agent API has CORS enabled.`)
        }
        throw new Error(`Agent API error: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.agent_response || "I apologize, but I couldn't process your request properly.",
        timestamp: new Date(),
        toolCalls: data.tool_calls,
        results: data.results
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (error) {
      console.error('Chat error:', error)
      
      // Add error message with fallback conversational response
      const fallbackResponse = generateFallbackResponse(inputMessage.trim(), agent)
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant", 
        content: fallbackResponse,
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }

  // Generate a fallback response when API is not available
  const generateFallbackResponse = (userInput: string, agent: Agent): string => {
    const input = userInput.toLowerCase()
    
    // Check for common Web3 operations
    if (input.includes('balance') || input.includes('wallet')) {
      return `I understand you want to check wallet balances. Once my backend is connected, I can help you check balances for any Ethereum address. 

For now, I can explain that ${agent.name} is designed to automate wallet monitoring and would typically:
1. Connect to your wallet
2. Fetch current ETH and token balances
3. Convert values to USD
4. Monitor for changes

Would you like me to explain more about how wallet operations work?`
    }
    
    if (input.includes('transfer') || input.includes('send')) {
      return `I can help you with token transfers! ${agent.name} can automate transfer operations including:

• ETH transfers between addresses
• ERC-20 token transfers
• Gas optimization
• Transaction confirmation

To execute real transfers, I need my backend API running. Would you like me to guide you through the transfer process or explain gas fees?`
    }
    
    if (input.includes('swap') || input.includes('trade')) {
      return `Token swapping is one of my specialties! I can help with:

• DEX integration (Uniswap, Sushiswap, 1inch)
• Price checking before swaps
• Slippage protection
• Multi-hop routing for best prices

${agent.name} is configured to handle these operations automatically. What tokens are you interested in swapping?`
    }
    
    if (input.includes('nft') || input.includes('721')) {
      return `NFT operations are supported! I can help with:

• Minting new NFTs
• Transferring NFT ownership
• Checking NFT metadata
• Managing NFT collections

${agent.name} can automate these processes. Are you working with a specific NFT collection?`
    }
    
    if (input.includes('price') || input.includes('market')) {
      return `I can fetch real-time cryptocurrency prices! Features include:

• Current prices for any token
• 24-hour price changes
• Historical data
• Price alerts and monitoring

What token prices would you like me to track? I can monitor ETH, BTC, and thousands of other cryptocurrencies.`
    }
    
    if (input.includes('hello') || input.includes('hi') || input.includes('hey')) {
      return `Hello! I'm ${agent.name}, your Web3 automation assistant. 

I'm currently running in offline mode, but I can still help you understand:
• How your workflow operates
• Web3 concepts and operations
• Planning your automation strategy

Once my backend is connected (localhost:8000), I'll be able to execute real transactions. What would you like to explore?`
    }
    
    // Generic response
    return `I understand you're interested in "${userInput}". 

I'm ${agent.name} and I'm designed to help with Web3 automation including wallet management, token operations, NFT handling, and DeFi interactions.

Currently, I'm running in conversation-only mode because my backend API isn't connected. But I can still:
• Explain how your workflow would operate
• Help you plan Web3 automation strategies
• Answer questions about blockchain operations

What specific aspect of Web3 automation interests you most?`
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading agent...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/agents">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Agents
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Chat with {agent.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {agent.nodeCount} nodes • {agent.status}
                </p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-3xl ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {/* Tool Calls Summary */}
                  {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      <details className="cursor-pointer">
                        <summary>
                          Executed {message.toolCalls.length} operations
                        </summary>
                        <div className="mt-1 space-y-1">
                          {message.toolCalls.map((call, index) => (
                            <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                              <strong>{call.tool}:</strong> {JSON.stringify(call.parameters, null, 2)}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                  
                  <div className={`text-xs text-gray-400 mt-1 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 mr-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                    <Bot className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="inline-block p-3 rounded-lg bg-gray-100 rounded-bl-sm">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {agent.name} is thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isConnected ? "Type your message..." : "Connect your wallet to chat with the agent"}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  disabled={!isConnected || isLoading}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || !isConnected || isLoading}
                className="px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {!isConnected && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Please connect your wallet to start chatting with the agent
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
