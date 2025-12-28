"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { DateTimePicker } from "@/components/ui/date-time-picker"
import { useChainId } from "wagmi"
import { getTokenAddress, SUPPORTED_TOKENS, TOKEN_LIST } from "@/lib/token-addresses"
import type { WorkflowNode } from "@/lib/types"
import CodeEditor from "./code-editor"

interface NodeConfigPanelProps {
  node: WorkflowNode
  updateNodeData: (nodeId: string, data: any) => void
  onClose: () => void
}

export default function NodeConfigPanel({ node, updateNodeData, onClose }: NodeConfigPanelProps) {
  const [localData, setLocalData] = useState({ ...node.data })
  const chainId = useChainId()

  const handleChange = (key: string, value: any) => {
    setLocalData((prev) => ({
      ...prev,
      [key]: value,
    }))
    updateNodeData(node.id, { [key]: value })
  }

  // Auto-populate token address when symbol changes
  useEffect(() => {
    if (node.type === 'erc20-tokens' && (localData as any).symbol && chainId) {
      const tokenSymbol = (localData as any).symbol?.toUpperCase()
      const tokenAddress = getTokenAddress(tokenSymbol, chainId)
      
      if (tokenAddress && tokenAddress !== (localData as any).tokenAddress) {
        console.log(`Auto-setting token address for ${tokenSymbol} on chain ${chainId}: ${tokenAddress}`)
        handleChange('tokenAddress', tokenAddress)
        
        // Also set decimals
        const tokenInfo = TOKEN_LIST[tokenSymbol]
        if (tokenInfo) {
          handleChange('decimals', tokenInfo.decimals)
        }
      }
    }
  }, [(localData as any).symbol, chainId, node.type])

  const renderInputFields = () => {
    switch (node.type) {
      case "input":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="dataSource">Data Source</Label>
              <Select
                value={localData.dataSource || "manual"}
                onValueChange={(value) => handleChange("dataSource", value)}
              >
                <SelectTrigger id="dataSource">
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Input</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="file">File Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sampleData">Sample Data (JSON)</Label>
              <Textarea
                id="sampleData"
                value={localData.sampleData || ""}
                onChange={(e) => handleChange("sampleData", e.target.value)}
                className="h-32"
                placeholder='{"key": "value"}'
              />
            </div>
          </>
        )

      case "output":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="outputType">Output Type</Label>
              <Select
                value={localData.outputType || "console"}
                onValueChange={(value) => handleChange("outputType", value)}
              >
                <SelectTrigger id="outputType">
                  <SelectValue placeholder="Select output type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="console">Console</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outputFormat">Output Format</Label>
              <Select
                value={localData.outputFormat || "json"}
                onValueChange={(value) => handleChange("outputFormat", value)}
              >
                <SelectTrigger id="outputFormat">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="xml">XML</SelectItem>
                  <SelectItem value="text">Plain Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )

      case "process":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="processType">Process Type</Label>
              <Select
                value={localData.processType || "transform"}
                onValueChange={(value) => handleChange("processType", value)}
              >
                <SelectTrigger id="processType">
                  <SelectValue placeholder="Select process type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transform">Transform</SelectItem>
                  <SelectItem value="filter">Filter</SelectItem>
                  <SelectItem value="aggregate">Aggregate</SelectItem>
                  <SelectItem value="sort">Sort</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="processConfig">Process Configuration (JSON)</Label>
              <Textarea
                id="processConfig"
                value={localData.processConfig || ""}
                onChange={(e) => handleChange("processConfig", e.target.value)}
                className="h-32"
                placeholder='{"operation": "value"}'
              />
            </div>
          </>
        )

      case "conditional":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Input
                id="condition"
                value={localData.condition || ""}
                onChange={(e) => handleChange("condition", e.target.value)}
                placeholder="data.value > 10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trueLabel">True Path Label</Label>
              <Input
                id="trueLabel"
                value={localData.trueLabel || "Yes"}
                onChange={(e) => handleChange("trueLabel", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="falseLabel">False Path Label</Label>
              <Input
                id="falseLabel"
                value={localData.falseLabel || "No"}
                onChange={(e) => handleChange("falseLabel", e.target.value)}
              />
            </div>
          </>
        )

      case "code":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="codeLanguage">Language</Label>
              <Select
                value={localData.codeLanguage || "javascript"}
                onValueChange={(value) => handleChange("codeLanguage", value)}
              >
                <SelectTrigger id="codeLanguage">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <CodeEditor
                value={
                  localData.code ||
                  "// Write your code here\nfunction process(data) {\n  // Transform data\n  return data;\n}"
                }
                onChange={(value) => handleChange("code", value)}
                language={localData.codeLanguage || "javascript"}
              />
            </div>
          </>
        )

      case "erc20-tokens":
        return (
          <>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
              <p className="text-xs text-blue-900 font-semibold mb-1">🪙 Token Selection</p>
              <p className="text-xs text-gray-700">
                Select a token symbol and the contract address will be automatically configured for your network.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Token Symbol</Label>
              <Select
                value={(localData as any).symbol || ""}
                onValueChange={(value) => handleChange("symbol", value)}
              >
                <SelectTrigger id="symbol">
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_TOKENS.map((token) => (
                    <SelectItem key={token} value={token}>
                      {token} - {TOKEN_LIST[token].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Choose from popular ERC-20 tokens
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenAddress" className="flex items-center gap-1">
                Token Contract Address
                {(localData as any).tokenAddress && (
                  <span className="text-green-600 text-xs">✓ Auto-configured</span>
                )}
              </Label>
              <Input
                id="tokenAddress"
                value={(localData as any).tokenAddress || "Not set - Select a token symbol"}
                disabled
                className="font-mono text-xs bg-gray-50"
              />
              {(localData as any).symbol && !(localData as any).tokenAddress && (
                <p className="text-xs text-amber-600">
                  ⚠️ Token not available on current network (Chain ID: {chainId})
                </p>
              )}
              {(localData as any).tokenAddress && (
                <p className="text-xs text-green-600">
                  ✅ Contract address configured for chain {chainId}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="operation">Operation</Label>
              <Select
                value={(localData as any).operation || "transfer"}
                onValueChange={(value) => handleChange("operation", value)}
              >
                <SelectTrigger id="operation">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">Check Balance</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="allowance">Check Allowance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (per transaction)</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                value={(localData as any).amount || ""}
                onChange={(e) => handleChange("amount", e.target.value)}
                placeholder="0.001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountLimit">Total Amount Limit</Label>
              <Input
                id="amountLimit"
                type="number"
                step="0.000001"
                value={(localData as any).amountLimit || ""}
                onChange={(e) => handleChange("amountLimit", e.target.value)}
                placeholder="1.0"
              />
              <p className="text-xs text-gray-500">
                Maximum total amount that can be transferred during the permission period
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <DateTimePicker
                  value={(localData as any).startTime || ""}
                  onChange={(value) => handleChange("startTime", value)}
                  placeholder="Select start time"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <DateTimePicker
                  value={(localData as any).endTime || ""}
                  onChange={(value) => handleChange("endTime", value)}
                  placeholder="Select end time"
                />
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mt-4">
              <p className="text-xs text-amber-900 font-semibold mb-2">⏰ Permission Parameters</p>
              <p className="text-xs text-gray-700">
                When connected with an ERC-4337 node, these time limits and amount restrictions
                will be used to request permissions from MetaMask.
              </p>
            </div>
          </>
        )

      case "native-token":
        return (
          <>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mb-4">
              <p className="text-xs text-purple-900 font-semibold mb-1">⚡ Native Token (ETH)</p>
              <p className="text-xs text-gray-700">
                Configure permissions for native ETH transfers. No contract address needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (per transaction)</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                value={(localData as any).amount || ""}
                onChange={(e) => handleChange("amount", e.target.value)}
                placeholder="0.01"
              />
              <p className="text-xs text-gray-500">ETH amount per transaction</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amountLimit">Total ETH Limit</Label>
              <Input
                id="amountLimit"
                type="number"
                step="0.001"
                value={(localData as any).amountLimit || ""}
                onChange={(e) => handleChange("amountLimit", e.target.value)}
                placeholder="0.1"
              />
              <p className="text-xs text-gray-500">
                Maximum total ETH that can be transferred during the permission period
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <DateTimePicker
                  value={(localData as any).startTime || ""}
                  onChange={(value) => handleChange("startTime", value)}
                  placeholder="Select start time"
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <DateTimePicker
                  value={(localData as any).endTime || ""}
                  onChange={(value) => handleChange("endTime", value)}
                  placeholder="Select end time"
                />
              </div>
            </div>

            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mt-4">
              <p className="text-xs text-purple-900 font-semibold mb-2">⏰ Permission Parameters</p>
              <p className="text-xs text-gray-700">
                When connected with an ERC-4337 node, these time limits and ETH amount restrictions
                will be used to request permissions from MetaMask for native ETH transfers.
              </p>
            </div>
          </>
        )

      case "transfer":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="to">Recipient Address</Label>
              <Input
                id="to"
                value={(localData as any).to || ""}
                onChange={(e) => handleChange("to", e.target.value)}
                placeholder="0x..."
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                value={(localData as any).amount || ""}
                onChange={(e) => handleChange("amount", e.target.value)}
                placeholder="0.001"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset">Asset Type</Label>
              <Select
                value={(localData as any).asset || "eth"}
                onValueChange={(value) => handleChange("asset", value)}
              >
                <SelectTrigger id="asset">
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eth">ETH (Native)</SelectItem>
                  <SelectItem value="erc20">ERC-20 Token</SelectItem>
                </SelectContent>
                <SelectContent>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="sepolia">Sepolia</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="arbitrum">Arbitrum</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )

      case "erc4337":
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="smartAccountAddress">Smart Account Address</Label>
              <Input
                id="smartAccountAddress"
                value={(localData as any).smartAccountAddress || "Creating..."}
                disabled
                className="font-mono text-xs bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                {(localData as any).smartAccountStatus === "created" 
                  ? "✅ Smart account created successfully"
                  : (localData as any).smartAccountStatus === "creating"
                  ? "⏳ Creating smart account..."
                  : (localData as any).smartAccountStatus === "error"
                  ? "❌ Failed to create smart account"
                  : "Smart account will be created automatically"}
              </p>
            </div>

            {(localData as any).smartAccountStatus === "created" && (
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    window.open(`/execute?nodeId=${node.id}`, '_blank');
                  }}
                >
                  🚀 Execute Transfer
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Opens execution interface in new tab
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="operation">Operation Type</Label>
              <Select
                value={(localData as any).operation || "send-user-operation"}
                onValueChange={(value) => handleChange("operation", value)}
              >
                <SelectTrigger id="operation">
                  <SelectValue placeholder="Select operation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create-account">Create Account</SelectItem>
                  <SelectItem value="send-user-operation">Send User Operation</SelectItem>
                  <SelectItem value="estimate-gas">Estimate Gas</SelectItem>
                  <SelectItem value="get-account-info">Get Account Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundlerUrl">Bundler URL (Optional)</Label>
              <Input
                id="bundlerUrl"
                value={localData.bundlerUrl || ""}
                onChange={(e) => handleChange("bundlerUrl", e.target.value)}
                placeholder="https://bundler.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymasterUrl">Paymaster URL (Optional)</Label>
              <Input
                id="paymasterUrl"
                value={localData.paymasterUrl || ""}
                onChange={(e) => handleChange("paymasterUrl", e.target.value)}
                placeholder="https://paymaster.example.com"
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-4">
              <p className="text-xs text-blue-900 font-semibold mb-2">🎯 Smart Account Info</p>
              <p className="text-xs text-gray-700">
                This node has an ERC-4337 smart account that can execute operations
                independently. Connect other nodes below this to define what actions
                this smart account can perform.
              </p>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Configure {node.data.label}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="label">Node Label</Label>
          <Input id="label" value={localData.label || ""} onChange={(e) => handleChange("label", e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={localData.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe what this node does"
          />
        </div>

        <div className="flex items-center space-x-2 py-2">
          <Switch
            id="required"
            checked={localData.required || false}
            onCheckedChange={(checked) => handleChange("required", checked)}
          />
          <Label htmlFor="required">Required Node</Label>
        </div>

        <div className="border-t border-gray-200 my-4"></div>

        {renderInputFields()}
      </div>
    </div>
  )
}