"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSendTransaction } from 'wagmi'
import { parseEther } from 'viem'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Send, Bot, User, Loader2 } from "lucide-react"
import { getAgents } from "@/lib/agents-utils"
import type { Agent } from "@/lib/types"
import { enrichMessageWithContext, convertWorkflowToAgentFormat, generateExecutionPlan } from "@/lib/workflow-executor"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  toolCalls?: any[]
  results?: any[]
}

// MetaMask transaction execution function
async function executeMetaMaskTransaction(transactionData: any, sendTransactionAsync: any) {
  try {
    console.log('🔄 Executing transaction through MetaMask:', transactionData);
    
    const { transaction } = transactionData;
    
    if (!transaction) {
      throw new Error('No transaction data provided');
    }

    console.log('📤 Sending transaction:', {
      to: transaction.to,
      value: transaction.value,
      data: transaction.data
    });

    // Execute transaction through MetaMask using async version
    const txHash = await sendTransactionAsync({
      to: transaction.to as `0x${string}`,
      value: BigInt(transaction.value),
      data: transaction.data as `0x${string}`,
    });

    console.log('✅ MetaMask transaction hash received:', txHash);
    return {
      success: true,
      hash: txHash,
      sponsored: transactionData.sponsoredTransaction || false,
      message: transactionData.sponsoredTransaction 
        ? 'Sponsored transaction sent! Gas fees covered by Pimlico.' 
        : 'Transaction sent successfully! Waiting for confirmation...'
    };
  } catch (error: any) {
    console.error('❌ MetaMask transaction failed:', error);
    return {
      success: false,
      error: error.message || 'MetaMask transaction failed',
      hash: null
    };
  }
}

export default function ChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const agentId = searchParams.get('agent')
  const { address, isConnected } = useAccount()
  const { sendTransactionAsync, isPending: isTransactionPending, error: transactionError } = useSendTransaction()
  
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
    const { nodes, edges } = agent.workflow
    
    // Find workflow execution order
    const nodeExecutionOrder = buildExecutionOrder(nodes, edges)
    
    // Convert nodes to tool format expected by backend
    for (let i = 0; i < nodeExecutionOrder.length; i++) {
      const node = nodeExecutionOrder[i]
      const nextNode = nodeExecutionOrder[i + 1]
      
      let toolName = mapNodeTypeToToolName(node.type, node.data?.label)
      
      if (toolName) {
        tools.push({
          tool: toolName,
          next_tool: nextNode ? mapNodeTypeToToolName(nextNode.type, nextNode.data?.label) : null,
          node_data: node.data,
          node_id: node.id
        })
      }
    }
    
    return tools
  }

  const mapNodeTypeToToolName = (nodeType: string, label?: string): string | null => {
    // Special case: Agent node (ERC-4337 with label "Agent") -> erc4337 tool
    if (nodeType === "erc4337" && label === "Agent") {
      return "erc4337"
    }
    
    // Map node types to backend tool names
    switch (nodeType) {
      case "erc4337":
        return "erc4337"
      case "wallet-balance":
        return "get_balance"
      case "transfer":
        return "transfer"
      case "swap":
        return "swap"
      case "erc20-tokens":
        return "erc20_tokens"
      case "fetch-price":
        return "fetch_price"
      case "wallet-analytics":
        return "wallet_analytics"
      case "native-token":
        return "native_token"
      default:
        return null
    }
  }

  const buildExecutionOrder = (nodes: any[], edges: any[]): any[] => {
    // Find the start node (Agent node or node with no incoming edges)
    const agentNode = nodes.find(n => n.type === "erc4337" && n.data?.label === "Agent")
    
    if (!agentNode) {
      return nodes // Fallback to all nodes if no agent node
    }
    
    // Build execution order by following edges from agent node
    const visited = new Set<string>()
    const executionOrder: any[] = []
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return
      
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return
      
      visited.add(nodeId)
      executionOrder.push(node)
      
      // Find connected nodes
      const connectedEdges = edges.filter(e => e.source === nodeId)
      connectedEdges.forEach(edge => {
        traverse(edge.target)
      })
    }
    
    traverse(agentNode.id)
    
    // Add any unvisited nodes
    nodes.forEach(node => {
      if (!visited.has(node.id) && node.id !== agentNode.id) {
        executionOrder.push(node)
      }
    })
    
    return executionOrder
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
      // Enrich user message with workflow execution context
      const enrichedMessage = enrichMessageWithContext(inputMessage.trim(), agent.workflow)
      const workflowFormat = convertWorkflowToAgentFormat(agent.workflow)
      const executionPlan = generateExecutionPlan(agent.workflow)

      // Prepare request for the agent API
      const agentRequest = {
        tools: convertWorkflowToTools(agent),
        workflow_structure: workflowFormat,
        execution_plan: executionPlan,
        user_message: enrichedMessage,
        original_message: inputMessage.trim(),
        private_key: address ? `demo_key_${address}` : undefined,
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
      
      // Check if any tool calls require transaction execution
      let finalContent = data.agent_response || "I apologize, but I couldn't process your request properly."
      let transactionExecuted = false
      
      if (data.tool_calls && data.results && isConnected && address) {
        for (let i = 0; i < data.tool_calls.length; i++) {
          const toolCall = data.tool_calls[i]
          const result = data.results[i]
          
          // Check if this is a transfer tool call - handle multiple response formats
          if (toolCall.tool === 'transfer' && result?.success) {
            try {
              console.log('🔄 Transfer tool call detected:', result)
              
              // Extract transaction data from API response or create it from tool call parameters
              let transactionData;
              
              if (result.result?.transaction) {
                // New format: API returned transaction data
                transactionData = result.result;
                console.log('✅ Using API transaction data:', transactionData);
              } else {
                // Old format: Create transaction from tool parameters
                console.log('⚡ Creating transaction from tool parameters:', toolCall.parameters);
                const amountWei = parseEther(toolCall.parameters.amount || "0");
                
                transactionData = {
                  transaction: {
                    from: toolCall.parameters.fromAddress,
                    to: toolCall.parameters.toAddress,
                    value: amountWei.toString(),
                    data: "0x"
                  },
                  amount: toolCall.parameters.amount,
                  recipient: toolCall.parameters.toAddress,
                  sender: toolCall.parameters.fromAddress,
                  sponsoredTransaction: true, // Assume Pimlico sponsorship
                  paymasterActive: true,
                  paymasterInfo: "🎯 Transaction sponsored by Pimlico - NO GAS FEES REQUIRED!",
                  tokenType: toolCall.parameters.tokenType || "ETH",
                  balance: "0"
                };
              }
              
              console.log('🔄 Triggering MetaMask transaction...', transactionData.transaction)
              console.log('🔍 sendTransactionAsync function:', typeof sendTransactionAsync)
              console.log('🔍 isConnected:', isConnected, 'address:', address)
              
              if (!sendTransactionAsync) {
                console.error('❌ sendTransactionAsync is not available')
                finalContent = `❌ **Transaction Failed**: MetaMask not properly connected`
                continue;
              }
              
              // Execute the transaction through MetaMask
              const txResult = await executeMetaMaskTransaction(transactionData, sendTransactionAsync)
              
              if (txResult.success) {
                const sponsorMessage = txResult.sponsored 
                  ? "🎯 **GASLESS TRANSACTION!** ✨ Pimlico paymaster covered all fees!"
                  : "⛽ **Transaction Complete**: Gas fees were paid from your wallet."
                
                finalContent = `✅ **Transaction Executed Successfully!**

📋 **Transfer Details**:
• Amount: ${transactionData.amount || toolCall.parameters?.amount || 'N/A'} ${transactionData.tokenType || toolCall.parameters?.tokenType || 'ETH'}
• To: \`${transactionData.recipient || toolCall.parameters?.toAddress || 'N/A'}\`
• From: \`${transactionData.sender || toolCall.parameters?.fromAddress || 'N/A'}\` (Smart Account)
• Balance: ${transactionData.balance || '0'} ETH

${sponsorMessage}

🔗 **Transaction Hash**: [${txResult.hash}](https://sepolia.etherscan.io/tx/${txResult.hash})
⚡ **Status**: ${transactionData.paymasterActive ? 'Sponsored by Pimlico' : 'User-paid gas'}

🌐 **MetaMask Confirmation**: Transaction has been sent to the Sepolia network and is being processed!

${transactionData.paymasterInfo || ''}

💡 **Track on Etherscan**: https://sepolia.etherscan.io/tx/${txResult.hash}`
                transactionExecuted = true
              } else {
                finalContent = `❌ **MetaMask Transaction Failed**

Error: ${txResult.error}

Please try again. Make sure:
• Your wallet is connected
• You have sufficient ETH for the transfer
• You approve the transaction in MetaMask`
              }
              break // Only execute first transaction
            } catch (error: any) {
              console.error('MetaMask transaction error:', error)
              finalContent = `❌ **Transaction Error**

${error.message || 'Failed to execute transaction through MetaMask'}

Please ensure:
• MetaMask is installed and connected
• You have sufficient funds
• The transaction was approved`
            }
          }
        }
      }
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalContent,
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
