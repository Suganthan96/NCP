"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { useAccount } from "wagmi"
import { useRouter } from "next/navigation"
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Panel,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  type Node,
} from "reactflow"
import "reactflow/dist/style.css"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Save, Upload, Play, Trash2, RotateCcw } from "lucide-react"
import NodeLibrary from "./node-library"
import NodeConfigPanel from "./node-config-panel"
import CustomEdge from "./custom-edge"
import { InputNode } from "./nodes/input-node"
import { OutputNode } from "./nodes/output-node"
import { ProcessNode } from "./nodes/process-node"
import { ConditionalNode } from "./nodes/conditional-node"
import { CodeNode } from "./nodes/code-node"
import { ERC4337Node } from "./nodes/erc4337-node"
import { WalletBalanceNode } from "./nodes/wallet-balance-node"
import { NativeTokenNode } from "./nodes/native-token-node"
import { ERC20TokensNode } from "./nodes/erc20-tokens-node"
import { FetchPriceNode } from "./nodes/fetch-price-node"
import { WalletAnalyticsNode } from "./nodes/wallet-analytics-node"
import { TransferNode } from "./nodes/transfer-node"
import { SwapNode } from "./nodes/swap-node"
import { generateNodeId, createNode } from "@/lib/workflow-utils"
import { saveAgent, generateAgentName, generateAgentDescription } from "@/lib/agents-utils"
import type { WorkflowNode, Workflow } from "@/lib/types"
import ManualPermissionRequestButton from "./ManualPermissionRequestButton"

// Create default nodes for the canvas
const createAgentNode = () => createNode({
  type: "erc4337",
  position: { x: 400, y: 200 },
  id: "agent-default"
})

const defaultNodes = [createAgentNode()]

// Modify the Agent node label after creation
defaultNodes[0].data.label = "Agent"
defaultNodes[0].data.description = "AI Agent for Web3 operations"

// No default edges - just one node
const defaultEdges: any[] = []

const nodeTypes: NodeTypes = {
  input: InputNode,
  output: OutputNode,
  process: ProcessNode,
  conditional: ConditionalNode,
  code: CodeNode,
  "erc4337": ERC4337Node,
  "wallet-balance": WalletBalanceNode,
  "native-token": NativeTokenNode,
  "erc20-tokens": ERC20TokensNode,
  "fetch-price": FetchPriceNode,
  "wallet-analytics": WalletAnalyticsNode,
  "transfer": TransferNode,
  "swap": SwapNode,
}

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

export default function WorkflowBuilder() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [smartAccounts, setSmartAccounts] = useState<Record<string, string>>({}) // Track smart accounts per node
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [workflowName, setWorkflowName] = useState("")
  const { address, isConnected } = useAccount()
  const router = useRouter()

  // Monitor nodes for smart account address changes
  useEffect(() => {
    const newSmartAccounts: Record<string, string> = {}
    
    nodes.forEach(node => {
      // Skip agent-default node as it's just a visual representation
      if (node.type === 'erc4337' && node.id !== 'agent-default') {
        const smartAccountAddress = (node.data as any).smartAccountAddress
        if (smartAccountAddress) {
          console.log(`✅ Found smart account in node ${node.id}:`, smartAccountAddress)
          newSmartAccounts[node.id] = smartAccountAddress
        }
      }
    })
    
    // Always update to ensure state is in sync
    const stateJson = JSON.stringify(smartAccounts)
    const newJson = JSON.stringify(newSmartAccounts)
    
    if (stateJson !== newJson) {
      console.log('Updating smart accounts state:', newSmartAccounts)
      setSmartAccounts(newSmartAccounts)
    }
  }, [nodes])

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, type: "custom" }, eds)),
    [setEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    console.log("Drag over event triggered")
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      console.log("Drop event triggered")

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const type = event.dataTransfer.getData("application/reactflow")
      console.log("Dropped node type:", type)

      // Check if the dropped element is valid
      if (typeof type === "undefined" || !type) {
        console.log("Invalid node type dropped")
        return
      }

      if (reactFlowBounds && reactFlowInstance) {
        console.log("React flow instance available")
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        })
        console.log("Drop position:", position)

        const newNode = createNode({
          type,
          position,
          id: generateNodeId(type),
        })
        console.log("Created new node:", newNode)

        setNodes((nds) => nds.concat(newNode))
      } else {
        console.log("Missing reactFlowBounds or reactFlowInstance")
        console.log("reactFlowBounds:", reactFlowBounds)
        console.log("reactFlowInstance:", reactFlowInstance)
      }
    },
    [reactFlowInstance, setNodes],
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const updateNodeData = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            }
          }
          return node
        }),
      )
      
      // If smart account address is being set, track it
      if (data.smartAccountAddress) {
        setSmartAccounts(prev => ({
          ...prev,
          [nodeId]: data.smartAccountAddress,
        }))
      }
    },
    [setNodes],
  )

  const saveWorkflow = () => {
    if (nodes.length === 0) {
      toast({
        title: "Nothing to save",
        description: "Add some nodes to your workflow first",
        variant: "destructive",
      })
      return
    }

    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to save agents",
        variant: "destructive",
      })
      return
    }

    // Show dialog to get workflow name
    setShowSaveDialog(true)
  }

  const handleSaveWithName = () => {
    const workflow: Workflow = {
      nodes: nodes as WorkflowNode[],
      edges,
    }

    try {
      const finalName = workflowName.trim() || generateAgentName(workflow)
      
      const savedAgent = saveAgent({
        name: finalName,
        description: generateAgentDescription(workflow),
        workflow,
        nodeCount: nodes.length,
        status: "draft",
        walletAddress: address,
      })

      toast({
        title: "Agent saved successfully!",
        description: `"${savedAgent.name}" has been saved to your agents`,
      })

      setShowSaveDialog(false)
      setWorkflowName("")

      // Redirect to agents page after a short delay
      setTimeout(() => {
        router.push('/agents')
      }, 1500)

    } catch (error) {
      console.error("Error saving agent:", error)
      toast({
        title: "Error saving agent",
        description: "There was an error saving your agent. Please try again.",
        variant: "destructive",
      })
    }
  }

  const loadWorkflow = () => {
    // This function could be enhanced to load specific saved agents
    // For now, we'll redirect to agents page where users can select an agent to edit
    router.push('/agents')
  }

  const executeWorkflow = () => {
    if (nodes.length === 0) {
      toast({
        title: "Nothing to execute",
        description: "Add some nodes to your workflow first",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Executing workflow",
      description: "Your workflow is being executed (simulation only in this MVP)",
    })

    // In a real implementation, we would traverse the graph and execute each node
    // For the MVP, we'll just simulate execution with a success message
    setTimeout(() => {
      toast({
        title: "Workflow executed",
        description: "Your workflow has been executed successfully",
      })
    }, 2000)
  }

  const clearCanvas = () => {
    setNodes([])
    setEdges([])
    toast({
      title: "Canvas cleared",
      description: "All nodes and connections have been removed",
    })
  }

  const resetToDefault = () => {
    const agentNode = createAgentNode()
    agentNode.data.label = "Agent"
    agentNode.data.description = "AI Agent for Web3 operations"
    
    setNodes([agentNode])
    setEdges([])
    toast({
      title: "Canvas reset",
      description: "Canvas reset to default Agent node",
    })
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 border-r border-gray-200 p-4 bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">Node Library</h2>
        <NodeLibrary />
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              defaultEdgeOptions={{ type: "custom" }}
            >
              <Background />
              <Controls />
              <MiniMap />
              <Panel position="top-right">
                <div className="flex gap-2 flex-wrap">
                  <ManualPermissionRequestButton 
                    nodes={nodes}
                    edges={edges}
                    smartAccounts={smartAccounts}
                  />
                  <Button onClick={resetToDefault} size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Agent
                  </Button>
                  <Button onClick={clearCanvas} size="sm" variant="outline">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button onClick={saveWorkflow} size="sm" variant="outline">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={loadWorkflow} size="sm" variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    My Agents
                  </Button>
                  <Button onClick={executeWorkflow} size="sm" variant="default">
                    <Play className="h-4 w-4 mr-2" />
                    Execute
                  </Button>
                </div>
              </Panel>
              <Panel position="top-left">
                <div className="text-xs bg-white p-2 rounded shadow">
                  Debug: RF Instance: {reactFlowInstance ? 'Ready' : 'Not Ready'}
                </div>
              </Panel>
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Workflow</DialogTitle>
            <DialogDescription>
              Give your workflow a custom name or leave blank to auto-generate one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Workflow Name</Label>
              <Input
                id="workflow-name"
                placeholder="e.g., USDC Transfer Agent"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveWithName()
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Leave empty to auto-generate from workflow structure
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveWithName}>
              Save Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedNode && (
        <div className="w-80 border-l border-gray-200 p-4 bg-gray-50 overflow-y-auto">
          <NodeConfigPanel
            node={selectedNode as WorkflowNode}
            updateNodeData={updateNodeData}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  )
}
