from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
import json
import requests
import uvicorn
from groq import Groq

load_dotenv()

app = FastAPI(title="NCP AI Agent Builder with Groq")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client with environment variable fallback
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

print(f"Using Groq API Key: {GROQ_API_KEY[:20]}...")

try:
    groq_client = Groq(api_key=GROQ_API_KEY)
    print("Groq client initialized successfully")
except Exception as e:
    print(f"Warning: Failed to initialize Groq client: {e}")
    groq_client = None

# Tool Definitions for Web3 Operations
TOOL_DEFINITIONS = {
    "erc4337": {
        "name": "erc4337",
        "description": "Create and manage ERC-4337 smart accounts. Handles account abstraction operations.",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["create", "execute", "check_status"], "description": "Operation to perform"},
                "bundlerUrl": {"type": "string", "description": "Bundler URL for ERC-4337 operations"},
                "paymasterUrl": {"type": "string", "description": "Paymaster URL for gas sponsorship"},
                "userOperation": {"type": "object", "description": "User operation data for execution"}
            },
            "required": ["operation"]
        },
        "endpoint": "https://api.example.com/erc4337",
        "method": "POST"
    },
    "wallet_balance": {
        "name": "wallet_balance",
        "description": "Get wallet balance for ETH and tokens. Supports multiple currencies and USD conversion.",
        "parameters": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Wallet address to check balance"},
                "currency": {"type": "string", "default": "ETH", "description": "Currency type (ETH, USDC, etc.)"},
                "includeUsd": {"type": "boolean", "default": True, "description": "Include USD value conversion"}
            },
            "required": ["address"]
        },
        "endpoint": "https://api.example.com/balance/{address}",
        "method": "GET"
    },
    "erc20_tokens": {
        "name": "erc20_tokens",
        "description": "Handle ERC-20 token operations including transfers, approvals, and balance checks.",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["transfer", "approve", "balance", "allowance"], "description": "Token operation"},
                "contractAddress": {"type": "string", "description": "Token contract address"},
                "fromAddress": {"type": "string", "description": "Sender address"},
                "toAddress": {"type": "string", "description": "Recipient address"},
                "amount": {"type": "string", "description": "Amount of tokens"},
                "privateKey": {"type": "string", "description": "Private key for signing transactions"}
            },
            "required": ["operation", "contractAddress"]
        },
        "endpoint": "https://api.example.com/erc20",
        "method": "POST"
    },
    "erc721_nft": {
        "name": "erc721_nft",
        "description": "Handle NFT operations including minting, transferring, and metadata management.",
        "parameters": {
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["mint", "transfer", "approve", "metadata", "owner"], "description": "NFT operation"},
                "contractAddress": {"type": "string", "description": "NFT contract address"},
                "tokenId": {"type": "string", "description": "Token ID for specific NFT"},
                "fromAddress": {"type": "string", "description": "Current owner address"},
                "toAddress": {"type": "string", "description": "Recipient address"},
                "metadata": {"type": "object", "description": "NFT metadata"},
                "privateKey": {"type": "string", "description": "Private key for signing transactions"}
            },
            "required": ["operation", "contractAddress"]
        },
        "endpoint": "https://api.example.com/erc721",
        "method": "POST"
    },
    "fetch_price": {
        "name": "fetch_price",
        "description": "Fetch real-time cryptocurrency and token prices with 24h change data.",
        "parameters": {
            "type": "object",
            "properties": {
                "tokenAddress": {"type": "string", "description": "Token contract address"},
                "symbol": {"type": "string", "description": "Token symbol (BTC, ETH, etc.)"},
                "vsCurrency": {"type": "string", "default": "usd", "description": "Price comparison currency"},
                "include24hChange": {"type": "boolean", "default": True, "description": "Include 24h price change"}
            }
        },
        "endpoint": "https://api.coingecko.com/api/v3/simple/price",
        "method": "GET"
    },
    "wallet_analytics": {
        "name": "wallet_analytics",
        "description": "Analyze wallet transaction history, token holdings, and activity patterns.",
        "parameters": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Wallet address to analyze"},
                "timeframe": {"type": "string", "enum": ["7d", "30d", "90d", "1y"], "default": "30d", "description": "Analysis timeframe"},
                "includeTokens": {"type": "boolean", "default": True, "description": "Include token analysis"},
                "includeNFTs": {"type": "boolean", "default": True, "description": "Include NFT analysis"}
            },
            "required": ["address"]
        },
        "endpoint": "https://api.example.com/analytics/{address}",
        "method": "GET"
    },
    "transfer": {
        "name": "transfer",
        "description": "Transfer ETH or tokens between addresses with gas optimization.",
        "parameters": {
            "type": "object",
            "properties": {
                "fromAddress": {"type": "string", "description": "Sender address"},
                "toAddress": {"type": "string", "description": "Recipient address"},
                "amount": {"type": "string", "description": "Amount to transfer"},
                "tokenType": {"type": "string", "enum": ["ETH", "ERC20"], "default": "ETH", "description": "Type of asset to transfer"},
                "tokenAddress": {"type": "string", "description": "Token contract address (for ERC20)"},
                "gasLimit": {"type": "string", "default": "21000", "description": "Gas limit for transaction"},
                "privateKey": {"type": "string", "description": "Private key for signing transaction"}
            },
            "required": ["fromAddress", "toAddress", "amount", "privateKey"]
        },
        "endpoint": "https://api.example.com/transfer",
        "method": "POST"
    },
    "swap": {
        "name": "swap",
        "description": "Swap tokens via DEX protocols with slippage protection.",
        "parameters": {
            "type": "object",
            "properties": {
                "fromToken": {"type": "string", "description": "Input token address or symbol"},
                "toToken": {"type": "string", "description": "Output token address or symbol"},
                "fromAmount": {"type": "string", "description": "Amount of input tokens"},
                "slippage": {"type": "string", "default": "0.5", "description": "Slippage tolerance percentage"},
                "dexProtocol": {"type": "string", "enum": ["uniswap", "sushiswap", "1inch"], "default": "uniswap", "description": "DEX protocol to use"},
                "userAddress": {"type": "string", "description": "User wallet address"},
                "privateKey": {"type": "string", "description": "Private key for signing transaction"}
            },
            "required": ["fromToken", "toToken", "fromAmount", "userAddress", "privateKey"]
        },
        "endpoint": "https://api.example.com/swap",
        "method": "POST"
    }
}

# Pydantic Models
class ToolConnection(BaseModel):
    tool: str
    next_tool: Optional[str] = None
    condition: Optional[str] = None  # For conditional execution

class AgentRequest(BaseModel):
    tools: List[ToolConnection]
    user_message: str
    private_key: Optional[str] = None
    context: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    message: str
    agentId: str
    tools: Optional[List[dict]] = []
    private_key: Optional[str] = None

class AgentResponse(BaseModel):
    agent_response: str
    tool_calls: List[Dict[str, Any]]
    results: List[Dict[str, Any]]
    workflow_summary: str

class CodeGenerationRequest(BaseModel):
    workflow_description: str
    tools_used: List[str]
    programming_language: str = "python"

class CodeGenerationResponse(BaseModel):
    generated_code: str
    explanation: str
    dependencies: List[str]

# Helper Functions
def build_system_prompt(tool_connections: List[ToolConnection]) -> str:
    """Build a dynamic system prompt based on connected tools for Web3 operations"""
    
    unique_tools = set()
    tool_flow = {}
    
    for conn in tool_connections:
        unique_tools.add(conn.tool)
        if conn.next_tool:
            unique_tools.add(conn.next_tool)
            tool_flow[conn.tool] = conn.next_tool
    
    has_sequential = any(conn.next_tool for conn in tool_connections)
    
    system_prompt = """You are an AI agent specialized in Web3 and blockchain operations. You help users build and execute Web3 workflows using smart contracts, DeFi protocols, and blockchain interactions.

AVAILABLE WEB3 TOOLS:
"""
    
    for tool_name in unique_tools:
        if tool_name in TOOL_DEFINITIONS:
            tool_def = TOOL_DEFINITIONS[tool_name]
            system_prompt += f"\n- {tool_name}: {tool_def['description']}\n"
    
    if has_sequential:
        system_prompt += "\n\nWORKFLOW EXECUTION:\n"
        system_prompt += "Tools are connected in a workflow sequence. Execute them in the specified order:\n"
        for tool, next_tool in tool_flow.items():
            system_prompt += f"- {tool} → {next_tool}\n"
        
        system_prompt += """
WORKFLOW EXECUTION RULES:
1. Execute tools in the exact sequence defined in the workflow
2. Pass relevant data between connected tools
3. Handle errors gracefully and provide meaningful feedback
4. For Web3 operations, always verify transaction success before proceeding
5. Provide gas estimates and transaction hashes when applicable
6. Complete the entire workflow before providing final summary
"""
    
    system_prompt += """
WEB3 OPERATION GUIDELINES:
* Always validate addresses and amounts before executing transactions
* Provide clear explanations of what each operation does
* Include gas fees and network information
* Handle private keys securely and never log them
* Provide transaction hashes and block explorer links
* Explain smart contract interactions in simple terms
* Warn users about potential risks (slippage, gas costs, etc.)

RESPONSE FORMAT:
* Be conversational and educational
* Explain Web3 concepts when needed
* Provide step-by-step breakdown of operations
* Include relevant links and resources
* Summarize the complete workflow at the end
"""
    
    return system_prompt

def execute_tool(tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a Web3 tool by calling its API endpoint"""
    
    if tool_name not in TOOL_DEFINITIONS:
        raise ValueError(f"Unknown tool: {tool_name}")
    
    tool_def = TOOL_DEFINITIONS[tool_name]
    endpoint = tool_def["endpoint"]
    method = tool_def["method"]
    
    # Handle URL parameters for GET requests
    if "{address}" in endpoint:
        if "address" in parameters:
            endpoint = endpoint.replace("{address}", parameters["address"])
            # Don't include address in POST body for GET requests
            if method == "GET":
                parameters = {k: v for k, v in parameters.items() if k != "address"}
    
    headers = {"Content-Type": "application/json"}
    
    try:
        if method == "POST":
            # For demo purposes, simulate API responses
            simulated_result = simulate_web3_operation(tool_name, parameters)
            return {
                "success": True,
                "tool": tool_name,
                "result": simulated_result,
                "timestamp": "2025-12-23T16:20:00Z"
            }
        elif method == "GET":
            # Simulate GET operation
            simulated_result = simulate_web3_operation(tool_name, parameters)
            return {
                "success": True,
                "tool": tool_name,
                "result": simulated_result,
                "timestamp": "2025-12-23T16:20:00Z"
            }
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
            
    except Exception as e:
        return {
            "success": False,
            "tool": tool_name,
            "error": str(e)
        }

def simulate_web3_operation(tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Simulate Web3 operations for demo purposes"""
    
    if tool_name == "erc4337":
        return {
            "accountAddress": "0x1234...5678",
            "bundlerTxHash": "0xabc123...",
            "status": "deployed",
            "gasUsed": "250000"
        }
    elif tool_name == "wallet_balance":
        return {
            "address": parameters.get("address", "0x..."),
            "balance": "1.25",
            "currency": parameters.get("currency", "ETH"),
            "usdValue": "2500.50",
            "lastUpdated": "2025-12-23T16:20:00Z"
        }
    elif tool_name == "erc20_tokens":
        return {
            "operation": parameters.get("operation"),
            "txHash": "0xdef456...",
            "status": "confirmed",
            "gasUsed": "65000",
            "tokenAmount": parameters.get("amount", "0")
        }
    elif tool_name == "erc721_nft":
        return {
            "operation": parameters.get("operation"),
            "tokenId": parameters.get("tokenId", "1"),
            "txHash": "0xghi789...",
            "metadata": {"name": "Demo NFT", "image": "https://example.com/nft.png"}
        }
    elif tool_name == "fetch_price":
        return {
            "symbol": parameters.get("symbol", "ETH"),
            "priceUsd": "2000.50",
            "priceChange24h": "+2.5%",
            "lastFetched": "2025-12-23T16:20:00Z"
        }
    elif tool_name == "wallet_analytics":
        return {
            "address": parameters.get("address"),
            "totalTransactions": 150,
            "totalValue": "25000.75",
            "topTokens": ["USDC", "LINK", "UNI"],
            "nftCount": 5,
            "riskScore": "LOW"
        }
    elif tool_name == "transfer":
        return {
            "txHash": "0xjkl012...",
            "fromAddress": parameters.get("fromAddress"),
            "toAddress": parameters.get("toAddress"),
            "amount": parameters.get("amount"),
            "gasUsed": "21000",
            "status": "confirmed"
        }
    elif tool_name == "swap":
        return {
            "txHash": "0xmno345...",
            "fromToken": parameters.get("fromToken"),
            "toToken": parameters.get("toToken"),
            "fromAmount": parameters.get("fromAmount"),
            "toAmount": "1850.25",
            "slippage": "0.3%",
            "gasUsed": "180000"
        }
    
    return {"status": "executed", "parameters": parameters}

def get_groq_tools(tool_names: List[str]) -> List[Dict[str, Any]]:
    """Convert tool definitions to Groq function calling format"""
    
    tools = []
    for tool_name in tool_names:
        if tool_name in TOOL_DEFINITIONS:
            tool_def = TOOL_DEFINITIONS[tool_name]
            tools.append({
                "type": "function",
                "function": {
                    "name": tool_def["name"],
                    "description": tool_def["description"],
                    "parameters": tool_def["parameters"]
                }
            })
    
    return tools

def process_agent_conversation(
    system_prompt: str,
    user_message: str,
    available_tools: List[str],
    tool_flow: Dict[str, str],
    private_key: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
    max_iterations: int = 10
) -> Dict[str, Any]:
    """Process conversation with Groq AI agent"""
    
    # Add context to system prompt
    if private_key:
        system_prompt += f"\n\nCONTEXT: Private key is available for transaction signing."
    
    if context:
        system_prompt += f"\n\nADDITIONAL CONTEXT: {json.dumps(context, indent=2)}"
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
    
    # Get Groq formatted tools
    groq_tools = get_groq_tools(available_tools)
    
    all_tool_calls = []
    all_tool_results = []
    iteration = 0
    
    while iteration < max_iterations:
        iteration += 1
        
        # Call Groq API
        try:
            if not groq_client:
                raise Exception("Groq client not initialized")
                
            response = groq_client.chat.completions.create(
                model="llama3-groq-70b-8192-tool-use-preview",  # Groq's tool-use enabled model
                messages=messages,
                tools=groq_tools if groq_tools else None,
                tool_choice="auto" if groq_tools else None,
                temperature=0.7,
                max_tokens=4096
            )
        except Exception as e:
            print(f"Tool model error: {e}, falling back to standard model")
            # Fallback to non-tool model if tool model fails
            try:
                if not groq_client:
                    raise Exception("Groq client not initialized")
                    
                response = groq_client.chat.completions.create(
                    model="llama3-70b-8192",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=4096
                )
            except Exception as e2:
                print(f"Fallback model error: {e2}")
                # Return a simulated response if both fail
                return {
                    "agent_response": f"I'm currently having trouble connecting to my AI backend. Error: {str(e2)}. However, I can still simulate the requested operations.",
                    "tool_calls": all_tool_calls,
                    "results": all_tool_results,
                    "workflow_summary": generate_workflow_summary(all_tool_calls, all_tool_results),
                    "conversation_history": messages
                }
        
        assistant_message = response.choices[0].message
        
        # Check if there are tool calls
        if not hasattr(assistant_message, 'tool_calls') or not assistant_message.tool_calls:
            # No more tool calls, return final response
            workflow_summary = generate_workflow_summary(all_tool_calls, all_tool_results)
            return {
                "agent_response": assistant_message.content,
                "tool_calls": all_tool_calls,
                "results": all_tool_results,
                "workflow_summary": workflow_summary,
                "conversation_history": messages
            }
        
        # Process tool calls
        if hasattr(assistant_message, 'tool_calls') and assistant_message.tool_calls:
            messages.append({
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": assistant_message.tool_calls
            })
            
            for tool_call in assistant_message.tool_calls:
                function_name = tool_call.function.name
                function_args = json.loads(tool_call.function.arguments)
                
                # Add private key if needed and available
                if private_key and "privateKey" in TOOL_DEFINITIONS[function_name]["parameters"]["properties"]:
                    if "privateKey" not in function_args:
                        function_args["privateKey"] = private_key
                
                all_tool_calls.append({
                    "tool": function_name,
                    "parameters": function_args
                })
                
                # Execute the tool
                result = execute_tool(function_name, function_args)
                all_tool_results.append(result)
                
                # Add tool result to messages
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result)
                })
        else:
            # No tool calls, just add the assistant message and continue
            messages.append({
                "role": "assistant", 
                "content": assistant_message.content
            })
        
        # Check for sequential execution
        last_tool_executed = all_tool_calls[-1]["tool"]
        if last_tool_executed in tool_flow:
            next_tool = tool_flow[last_tool_executed]
            messages.append({
                "role": "system",
                "content": f"Now execute {next_tool} as the next step in the workflow sequence."
            })
    
    # Max iterations reached
    workflow_summary = generate_workflow_summary(all_tool_calls, all_tool_results)
    return {
        "agent_response": "Workflow execution completed (max iterations reached).",
        "tool_calls": all_tool_calls,
        "results": all_tool_results,
        "workflow_summary": workflow_summary,
        "conversation_history": messages
    }

def generate_workflow_summary(tool_calls: List[Dict], results: List[Dict]) -> str:
    """Generate a summary of the executed workflow"""
    if not tool_calls:
        return "No operations were executed."
    
    summary = f"Executed {len(tool_calls)} operations:\n"
    for i, (call, result) in enumerate(zip(tool_calls, results), 1):
        tool_name = call["tool"]
        success = result.get("success", False)
        status = "✅ Success" if success else "❌ Failed"
        summary += f"{i}. {tool_name}: {status}\n"
    
    return summary

def generate_code_from_workflow(workflow_description: str, tools_used: List[str], language: str = "python") -> Dict[str, Any]:
    """Generate code based on workflow description using Groq"""
    
    system_prompt = f"""You are an expert blockchain developer. Generate {language} code that implements the described Web3 workflow.

REQUIREMENTS:
- Generate clean, well-commented code
- Include error handling and validation
- Use best practices for Web3 development
- Include necessary imports and dependencies
- Provide clear explanations

TOOLS USED: {', '.join(tools_used)}
"""
    
    user_prompt = f"""Generate {language} code for this Web3 workflow:

{workflow_description}

Include:
1. Main implementation
2. Error handling
3. Comments explaining each step
4. List of required dependencies
"""
    
    try:
        if not groq_client:
            raise Exception("Groq client not initialized")
            
        response = groq_client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=4096
        )
        
        generated_content = response.choices[0].message.content
        
        # Extract code and explanation
        parts = generated_content.split("```")
        if len(parts) >= 3:
            code = parts[1].strip()
            if code.startswith(language):
                code = code[len(language):].strip()
            explanation = parts[0] + (parts[2] if len(parts) > 2 else "")
        else:
            code = generated_content
            explanation = f"Generated {language} code for the Web3 workflow"
        
        # Extract dependencies
        dependencies = extract_dependencies(code, language)
        
        return {
            "generated_code": code,
            "explanation": explanation.strip(),
            "dependencies": dependencies
        }
        
    except Exception as e:
        return {
            "generated_code": f"# Error generating code: {str(e)}",
            "explanation": f"Failed to generate code: {str(e)}",
            "dependencies": []
        }

def extract_dependencies(code: str, language: str) -> List[str]:
    """Extract dependencies from generated code"""
    dependencies = []
    
    if language == "python":
        import re
        import_lines = re.findall(r'^(?:from|import)\s+([a-zA-Z_][a-zA-Z0-9_]*)', code, re.MULTILINE)
        dependencies = list(set(import_lines))
    
    return dependencies

# API Endpoints
@app.post("/agent/chat")
async def chat_with_agent_simple(request: AgentRequest):
    """
    Chat endpoint that handles both simple messages and workflow-based agent requests.
    """
    try:
        print(f"Received chat request: {request.user_message}")
        print(f"Tools: {[tool.tool for tool in request.tools] if request.tools else 'None'}")
        
        # Build system prompt based on tools
        if request.tools:
            system_prompt = build_system_prompt(request.tools)
        else:
            # Default Web3 assistant prompt
            system_prompt = """You are a helpful Web3 AI assistant. You can help users with:
- Checking wallet balances and information
- Token operations and information  
- NFT operations and information
- DeFi protocols and concepts
- General blockchain and cryptocurrency questions

Always be helpful and provide clear explanations."""

        # Process the conversation with Groq
        if not groq_client:
            return {
                "agent_response": "AI service temporarily unavailable. Please try again later.",
                "tool_calls": [],
                "results": []
            }
        
        try:
            # Simple conversation without complex tools for now
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.user_message}
            ]
            
            print(f"Calling Groq API with {len(messages)} messages")
            
            # Call Groq API
            chat_completion = groq_client.chat.completions.create(
                messages=messages,
                model="llama-3.1-70b-versatile",
                temperature=0.7,
                max_tokens=1000
            )
            
            response = chat_completion.choices[0].message.content
            print(f"Groq API response received: {len(response)} characters")
            
            return {
                "agent_response": response,
                "tool_calls": [],
                "results": []
            }
            
        except Exception as groq_error:
            print(f"Groq API error: {groq_error}")
            print(f"Error type: {type(groq_error)}")
            print(f"Error details: {str(groq_error)}")
            
            # Provide helpful fallback responses based on message content
            user_msg_lower = request.user_message.lower()
            if "defi" in user_msg_lower:
                fallback = "DeFi (Decentralized Finance) refers to financial services built on blockchain networks that operate without traditional intermediaries like banks. It includes lending, borrowing, trading, and yield farming protocols."
            elif "nft" in user_msg_lower:
                fallback = "NFTs (Non-Fungible Tokens) are unique digital assets stored on blockchain networks. They can represent art, collectibles, gaming items, or any unique digital content with verified ownership."
            elif "wallet" in user_msg_lower or "balance" in user_msg_lower:
                fallback = "A crypto wallet stores your digital assets and private keys. You can check balances, send transactions, and interact with DeFi protocols through wallet applications."
            elif "ethereum" in user_msg_lower or "eth" in user_msg_lower:
                fallback = "Ethereum is a blockchain platform that supports smart contracts and decentralized applications (dApps). ETH is its native cryptocurrency used for transactions and gas fees."
            else:
                fallback = "I'm a Web3 AI assistant here to help with blockchain, cryptocurrency, DeFi, and NFT questions. What would you like to learn about?"
                
            return {
                "agent_response": fallback,
                "tool_calls": [],
                "results": []
            }
        
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/agent/workflow", response_model=AgentResponse)
async def chat_with_agent_workflow(request: AgentRequest):
    """
    Main endpoint to interact with the Web3 AI agent using Groq.
    """
    try:
        print(f"Received request: {request.user_message}")
        print(f"Tools: {[tool.tool for tool in request.tools]}")
        
        # Extract tools and build workflow
        unique_tools = set()
        tool_flow = {}
        
        for conn in request.tools:
            unique_tools.add(conn.tool)
            if conn.next_tool:
                unique_tools.add(conn.next_tool)
                tool_flow[conn.tool] = conn.next_tool
        
        available_tools = list(unique_tools)
        print(f"Available tools: {available_tools}")
        
        # Validate tools
        for tool in available_tools:
            if tool not in TOOL_DEFINITIONS:
                print(f"Unknown tool: {tool}")
                raise HTTPException(status_code=400, detail=f"Unknown tool: {tool}")
        
        # Build system prompt
        system_prompt = build_system_prompt(request.tools)
        print(f"System prompt length: {len(system_prompt)}")
        
        # Process conversation
        result = process_agent_conversation(
            system_prompt=system_prompt,
            user_message=request.user_message,
            available_tools=available_tools,
            tool_flow=tool_flow,
            private_key=request.private_key,
            context=request.context
        )
        
        print(f"Generated response length: {len(result['agent_response'])}")
        
        return AgentResponse(
            agent_response=result["agent_response"],
            tool_calls=result["tool_calls"],
            results=result["results"],
            workflow_summary=result["workflow_summary"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in chat_with_agent: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Return a proper error response instead of raising an exception
        return AgentResponse(
            agent_response=f"I encountered an error while processing your request: {str(e)}. Let me help you in a different way.",
            tool_calls=[],
            results=[],
            workflow_summary="Error occurred during processing"
        )

@app.post("/agent/generate-code", response_model=CodeGenerationResponse)
async def generate_code(request: CodeGenerationRequest):
    """
    Generate code based on workflow description using Groq AI.
    """
    try:
        result = generate_code_from_workflow(
            request.workflow_description,
            request.tools_used,
            request.programming_language
        )
        
        return CodeGenerationResponse(
            generated_code=result["generated_code"],
            explanation=result["explanation"],
            dependencies=result["dependencies"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "NCP AI Agent Builder",
        "ai_provider": "Groq",
        "model": "llama3-groq-70b-8192-tool-use-preview"
    }

@app.get("/tools")
async def list_tools():
    """List all available Web3 tools"""
    return {
        "tools": list(TOOL_DEFINITIONS.keys()),
        "details": TOOL_DEFINITIONS,
        "categories": {
            "Account Abstraction": ["erc4337"],
            "Wallet Operations": ["wallet_balance", "wallet_analytics"],
            "Token Operations": ["erc20_tokens", "transfer"],
            "NFT Operations": ["erc721_nft"],
            "DeFi Operations": ["swap", "fetch_price"]
        }
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "NCP AI Agent Builder API",
        "description": "Web3 workflow automation using Groq AI",
        "endpoints": {
            "chat": "/agent/chat",
            "generate_code": "/agent/generate-code",
            "tools": "/tools",
            "health": "/health"
        },
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
