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
import re

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

# Store user data for context (in production, use a proper database)
user_data = {}

# Tool Definitions for Web3 Operations using External APIs
TOOL_DEFINITIONS = {
    "transfer": {
        "name": "transfer",
        "description": "Transfer tokens from one address to another. Requires privateKey, toAddress, amount, and tokenAddress.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the sender wallet"},
                "toAddress": {"type": "string", "description": "Recipient wallet address"},
                "amount": {"type": "string", "description": "Amount of tokens to transfer"},
                "tokenAddress": {"type": "string", "description": "Contract address of the token"}
            },
            "required": ["privateKey", "toAddress", "amount", "tokenAddress"]
        },
        "endpoint": "http://localhost:3000/api/transfer",
        "method": "POST"
    },
    "swap": {
        "name": "swap",
        "description": "Swap one token for another. Requires privateKey, tokenIn, tokenOut, amountIn, and slippageTolerance.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the wallet"},
                "tokenIn": {"type": "string", "description": "Input token contract address"},
                "tokenOut": {"type": "string", "description": "Output token contract address"},
                "amountIn": {"type": "string", "description": "Amount of input tokens"},
                "slippageTolerance": {"type": "number", "description": "Slippage tolerance percentage"}
            },
            "required": ["privateKey", "tokenIn", "tokenOut", "amountIn", "slippageTolerance"]
        },
        "endpoint": "http://localhost:3000/api/swap",
        "method": "POST"
    },
    "get_balance": {
        "name": "get_balance",
        "description": "Get STT balance of a wallet address. Requires only the wallet address.",
        "parameters": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Wallet address to check balance"}
            },
            "required": ["address"]
        },
        "endpoint": "http://localhost:3000/api/balance/{address}",
        "method": "GET"
    },
    "deploy_erc20": {
        "name": "deploy_erc20",
        "description": "Deploy a new ERC-20 token. Requires privateKey, name, symbol, and initialSupply.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the deployer wallet"},
                "name": {"type": "string", "description": "Token name"},
                "symbol": {"type": "string", "description": "Token symbol"},
                "initialSupply": {"type": "string", "description": "Initial token supply"}
            },
            "required": ["privateKey", "name", "symbol", "initialSupply"]
        },
        "endpoint": "http://localhost:3000/api/deploy-token",
        "method": "POST"
    },
    "deploy_erc721": {
        "name": "deploy_erc721",
        "description": "Deploy a new ERC-721 NFT collection. Requires privateKey, name, and symbol.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the deployer wallet"},
                "name": {"type": "string", "description": "NFT collection name"},
                "symbol": {"type": "string", "description": "NFT collection symbol"}
            },
            "required": ["privateKey", "name", "symbol"]
        },
        "endpoint": "http://localhost:3000/api/create-nft-collection",
        "method": "POST"
    },
    "create_dao": {
        "name": "create_dao",
        "description": "Create a new DAO (Decentralized Autonomous Organization). Requires privateKey, name, votingPeriod, and quorumPercentage.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the DAO creator"},
                "name": {"type": "string", "description": "DAO name"},
                "votingPeriod": {"type": "string", "description": "Voting period in seconds"},
                "quorumPercentage": {"type": "string", "description": "Quorum percentage required for voting"}
            },
            "required": ["privateKey", "name", "votingPeriod", "quorumPercentage"]
        },
        "endpoint": "http://localhost:3000/api/create-dao",
        "method": "POST"
    },
    "airdrop": {
        "name": "airdrop",
        "description": "Airdrop tokens to multiple recipients. Requires privateKey, recipients (list of addresses), and amount per recipient.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the sender wallet"},
                "recipients": {"type": "array", "items": {"type": "string"}, "description": "List of recipient wallet addresses"},
                "amount": {"type": "string", "description": "Amount to send to each recipient"}
            },
            "required": ["privateKey", "recipients", "amount"]
        },
        "endpoint": "http://localhost:3000/api/airdrop",
        "method": "POST"
    },
    "fetch_price": {
        "name": "fetch_price",
        "description": "Fetch the current price of any cryptocurrency or token. Requires a query string.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Query string for token price (e.g., 'bitcoin current price')"}
            },
            "required": ["query"]
        },
        "endpoint": "http://localhost:3000/api/token-price",
        "method": "POST"
    },
    "deposit_yield": {
        "name": "deposit_yield",
        "description": "Create a deposit with yield prediction. Requires privateKey, tokenAddress, depositAmount, and apyPercent.",
        "parameters": {
            "type": "object",
            "properties": {
                "privateKey": {"type": "string", "description": "Private key of the depositor wallet"},
                "tokenAddress": {"type": "string", "description": "Token contract address to deposit"},
                "depositAmount": {"type": "string", "description": "Amount to deposit"},
                "apyPercent": {"type": "number", "description": "Annual Percentage Yield (APY) percentage"}
            },
            "required": ["privateKey", "tokenAddress", "depositAmount", "apyPercent"]
        },
        "endpoint": "http://localhost:3000/api/yield",
        "method": "POST"
    },
    "wallet_analytics": {
        "name": "wallet_analytics",
        "description": "Get wallet analytics including ERC-20 token balances. Requires wallet address.",
        "parameters": {
            "type": "object",
            "properties": {
                "address": {"type": "string", "description": "Wallet address to analyze"}
            },
            "required": ["address"]
        },
        "endpoint": "http://localhost:3000/api/address/{address}/balance/erc20",
        "method": "GET"
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
    execution_plan: Optional[Dict[str, Any]] = None
    workflow_structure: Optional[Dict[str, Any]] = None
    original_message: Optional[str] = None

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
    """Execute a Web3 tool by calling its real API endpoint"""
    
    try:
        if tool_name not in TOOL_DEFINITIONS:
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}"
            }
        
        tool_def = TOOL_DEFINITIONS[tool_name]
        endpoint = tool_def["endpoint"]
        method = tool_def["method"]
        
        print(f"Executing tool: {tool_name} with parameters: {parameters}")
        
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
                print(f"Making POST request to: {endpoint}")
                response = requests.post(endpoint, json=parameters, headers=headers, timeout=30)
                print(f"Response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "tool": tool_name,
                        "result": result,
                        "endpoint": endpoint
                    }
                else:
                    return {
                        "success": False,
                        "tool": tool_name,
                        "error": f"API returned status {response.status_code}: {response.text}",
                        "endpoint": endpoint
                    }
                    
            elif method == "GET":
                print(f"Making GET request to: {endpoint}")
                response = requests.get(endpoint, params=parameters, headers=headers, timeout=30)
                print(f"Response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    return {
                        "success": True,
                        "tool": tool_name,
                        "result": result,
                        "endpoint": endpoint
                    }
                else:
                    return {
                        "success": False,
                        "tool": tool_name,
                        "error": f"API returned status {response.status_code}: {response.text}",
                        "endpoint": endpoint
                    }
            else:
                return {
                    "success": False,
                    "tool": tool_name,
                    "error": f"Unsupported HTTP method: {method}"
                }
                
        except requests.exceptions.Timeout:
            return {
                "success": False,
                "tool": tool_name,
                "error": "API request timed out after 30 seconds"
            }
        except requests.exceptions.RequestException as e:
            return {
                "success": False,
                "tool": tool_name,
                "error": f"Network error: {str(e)}"
            }
            
    except Exception as e:
        return {
            "success": False,
            "tool": tool_name,
            "error": f"Execution failed: {str(e)}"
        }

# Helper function to extract addresses and amounts from natural language
def extract_transfer_params(message: str) -> Dict[str, str]:
    """Extract transfer parameters from natural language"""
    # Pattern for Ethereum addresses (0x followed by 40 hex chars)
    address_pattern = r'0x[a-fA-F0-9]{40}'
    # Pattern for amounts (decimal numbers)
    amount_pattern = r'(\d+(?:\.\d+)?)\s*(eth|ETH)'
    
    addresses = re.findall(address_pattern, message)
    amounts = re.findall(amount_pattern, message)
    
    result = {}
    if addresses:
        result['to_address'] = addresses[0]  # First address found
    if amounts:
        result['amount'] = amounts[0][0]  # First amount found
    
    return result

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
    Supports function calling for real Web3 operations via external APIs.
    """
    try:
        print(f"Received chat request: {request.user_message}")
        print(f"Tools: {[tool.tool for tool in request.tools] if request.tools else 'None'}")
        
        # Extract user ID for context management
        user_id = getattr(request, 'user_id', 'default_user')
        
        # Check if user wants to check balance
        if any(word in request.user_message.lower() for word in ["balance", "check balance", "how much"]):
            # Try to extract address from message
            address_match = re.search(r'0x[a-fA-F0-9]{40}', request.user_message)
            if address_match:
                address = address_match.group(0)
                result = execute_tool("get_balance", {"address": address})
                
                if result["success"]:
                    balance_info = result["result"]
                    return {
                        "agent_response": f"💰 **Wallet Balance**\n\nAddress: `{address}`\nBalance: **{balance_info.get('balance', 'N/A')} STT**\n\nNetwork: Somnia",
                        "tool_calls": [{"tool": "get_balance", "parameters": {"address": address}}],
                        "results": [result]
                    }
                else:
                    return {
                        "agent_response": f"❌ Failed to get balance: {result['error']}",
                        "tool_calls": [],
                        "results": [result]
                    }
            else:
                return {
                    "agent_response": "I need a wallet address to check the balance. Please provide an address like:\n`Check balance for 0x1234567890123456789012345678901234567890`",
                    "tool_calls": [],
                    "results": []
                }
        
        # Extract smart account info from execution plan if available
        execution_steps = []
        smart_accounts = {}
        workflow_context = ""
        
        if request.execution_plan and isinstance(request.execution_plan, dict):
            execution_steps = request.execution_plan.get("execution_steps", [])
            
            # Extract smart accounts from execution steps
            for step in execution_steps:
                if isinstance(step, dict) and "smart_account" in step:
                    sa_address = step.get("smart_account")
                    if sa_address:
                        smart_accounts[f"step_{step.get('step', 0)}"] = sa_address
            
            # Build workflow context info (don't return, just prepare it)
            if execution_steps:
                workflow_context = f"\n\n🔧 **Workflow Ready**: {len(execution_steps)} step(s) configured with {len(smart_accounts)} smart account(s)"
        
        # Check if user wants to transfer tokens
        if any(word in request.user_message.lower() for word in ["transfer", "send"]):
            # Extract transfer details from user message
            address_matches = re.findall(r'0x[a-fA-F0-9]{40}', request.user_message)
            amount_match = re.search(r'(\d+(?:\.\d+)?)\s*(eth|usdc|usdt|dai)?', request.user_message.lower())
            
            user_recipient = address_matches[0] if address_matches else None
            user_amount = amount_match.group(1) if amount_match else None
            user_token = amount_match.group(2) if amount_match and amount_match.group(2) else "eth"
            
            # Check if we have execution steps with smart accounts
            if execution_steps:
                # Enhance steps with user-provided details
                enhanced_steps = []
                for step in execution_steps:
                    step_desc = step.get('description', step.get('operation'))
                    # Replace undefined/0 values with user input
                    if user_recipient and 'undefined' in step_desc:
                        step_desc = step_desc.replace('undefined', user_recipient)
                    if user_amount and ('0 ' in step_desc or 'X ' in step_desc):
                        step_desc = step_desc.replace('0 ETH', f'{user_amount} {user_token.upper()}')
                        step_desc = step_desc.replace('X ETH', f'{user_amount} {user_token.upper()}')
                        step_desc = step_desc.replace('X tokens', f'{user_amount} {user_token.upper()}')
                    enhanced_steps.append(step_desc)
                
                steps_info = "\n".join([f"• {desc}" for desc in enhanced_steps])
                
                # Get the smart account address
                primary_sa = list(smart_accounts.values())[0] if smart_accounts else "Not found"
                
                return {
                    "agent_response": f"✅ **Ready to Execute Transfer!**\n\n📋 **Transfer Details**:\n{steps_info}\n\n🔐 **Smart Account**: `{primary_sa}`{workflow_context}\n\n💡 **Configuration**:\n- ✅ Smart account created and ready\n- ✅ Recipient: `{user_recipient or 'Not specified'}`\n- ✅ Amount: {user_amount} {user_token.upper() if user_amount else 'Not specified'}\n- ✅ Using ERC-4337 for gasless transactions\n\n🚀 **To Execute**: Backend needs ERC-4337 UserOperation integration to send transactions via the smart account.\n\n📝 **How it works**:\n1. Your smart account (not your EOA) initiates the transfer\n2. Transaction is bundled into a UserOperation\n3. Paymaster can sponsor gas fees (gasless transactions)\n4. Higher security with account abstraction features",
                    "tool_calls": [],
                    "results": [],
                    "execution_plan": request.execution_plan
                }
            
            # Fallback: No workflow configured
            if len(address_matches) >= 1 and amount_match:  # Need recipient address and token address
                to_address = address_matches[0]  # First address is recipient
                token_address = address_matches[1] if len(address_matches) > 1 else "0x0000000000000000000000000000000000000000"  # Default STT token
                amount = amount_match.group(1)
                
                if not request.private_key:
                    return {
                        "agent_response": "I need your private key to execute the transfer. Please provide it securely in the request.",
                        "tool_calls": [],
                        "results": []
                    }
                
                transfer_params = {
                    "privateKey": request.private_key,
                    "toAddress": to_address,
                    "amount": amount,
                    "tokenAddress": token_address
                }
                
                result = execute_tool("transfer", transfer_params)
                
                if result["success"]:
                    tx_info = result["result"]
                    return {
                        "agent_response": f"✅ **Transfer Successful!**\n\n💸 Amount: **{amount} tokens**\n📍 To: `{to_address}`\n🔗 Transaction: `{tx_info.get('transactionHash', 'N/A')}`\n🌐 Network: Somnia",
                        "tool_calls": [{"tool": "transfer", "parameters": transfer_params}],
                        "results": [result]
                    }
                else:
                    return {
                        "agent_response": f"❌ Transfer failed: {result['error']}",
                        "tool_calls": [],
                        "results": [result]
                    }
            else:
                return {
                    "agent_response": "I need more information for the transfer. Please provide:\n- Recipient address\n- Token address (optional, defaults to STT)\n- Amount\n\nExample: `Transfer 10 to 0x1234567890123456789012345678901234567890`",
                    "tool_calls": [],
                    "results": []
                }
        
        # Check if user wants to swap tokens
        if any(word in request.user_message.lower() for word in ["swap", "exchange"]):
            # Extract swap parameters (simplified)
            addresses = re.findall(r'0x[a-fA-F0-9]{40}', request.user_message)
            amount_match = re.search(r'(\d+(?:\.\d+)?)', request.user_message)
            
            if len(addresses) >= 2 and amount_match:
                token_in = addresses[0]
                token_out = addresses[1]
                amount_in = amount_match.group(1)
                
                if not request.private_key:
                    return {
                        "agent_response": "I need your private key to execute the swap. Please provide it securely in the request.",
                        "tool_calls": [],
                        "results": []
                    }
                
                swap_params = {
                    "privateKey": request.private_key,
                    "tokenIn": token_in,
                    "tokenOut": token_out,
                    "amountIn": amount_in,
                    "slippageTolerance": 0.5
                }
                
                result = execute_tool("swap", swap_params)
                
                if result["success"]:
                    swap_info = result["result"]
                    return {
                        "agent_response": f"🔄 **Swap Successful!**\n\n💰 Swapped: **{amount_in} tokens**\n🔁 From: `{token_in}`\n🔁 To: `{token_out}`\n🔗 Transaction: `{swap_info.get('transactionHash', 'N/A')}`",
                        "tool_calls": [{"tool": "swap", "parameters": swap_params}],
                        "results": [result]
                    }
                else:
                    return {
                        "agent_response": f"❌ Swap failed: {result['error']}",
                        "tool_calls": [],
                        "results": [result]
                    }
            else:
                return {
                    "agent_response": "For token swaps, please provide:\n- Token A address (from)\n- Token B address (to)\n- Amount\n\nExample: `Swap 100 from 0x1234... to 0x5678...`",
                    "tool_calls": [],
                    "results": []
                }
        
        # Check if user wants price information
        if any(word in request.user_message.lower() for word in ["price", "cost", "value"]):
            # Extract token name or symbol
            tokens = ["bitcoin", "ethereum", "btc", "eth", "usdt", "usdc"]
            query = None
            for token in tokens:
                if token in request.user_message.lower():
                    query = f"{token} current price"
                    break
            
            if not query:
                query = request.user_message  # Use full message as query
            
            result = execute_tool("fetch_price", {"query": query})
            
            if result["success"]:
                price_info = result["result"]
                return {
                    "agent_response": f"💎 **Price Information**\n\n{price_info.get('response', 'Price data retrieved successfully')}",
                    "tool_calls": [{"tool": "fetch_price", "parameters": {"query": query}}],
                    "results": [result]
                }
            else:
                return {
                    "agent_response": f"❌ Failed to fetch price: {result['error']}",
                    "tool_calls": [],
                    "results": [result]
                }
        
        # For general Web3 questions, use Groq AI
        if not groq_client:
            return {
                "agent_response": "AI service temporarily unavailable. Please try again later.",
                "tool_calls": [],
                "results": []
            }
        
        try:
            # Enhanced system prompt with function calling capabilities
            system_prompt = """You are a Web3 AI assistant with real blockchain capabilities on the Somnia network. You can:

🏦 **ACCOUNT OPERATIONS**: 
   - Check wallet balances: "Check balance for 0x..."
   - Get wallet analytics and token holdings
   
💸 **TOKEN OPERATIONS**: 
   - Transfer tokens: "Transfer [amount] to 0x..."
   - Token swaps: "Swap [amount] from 0x... to 0x..."
   - Deploy ERC-20 tokens: "Deploy token named [name] with symbol [symbol]"
   
🎨 **NFT OPERATIONS**: 
   - Deploy NFT collections: "Create NFT collection [name]"
   - Manage NFT operations
   
🏛️ **ADVANCED FEATURES**:
   - Create DAOs: "Create DAO named [name]"
   - Airdrop tokens: "Airdrop [amount] to [addresses]"
   - Yield farming deposits
   
� **SMART ACCOUNT OPERATIONS**:
   - Create ERC-4337 smart accounts: "Create smart account for 0x..."
   - Enable gasless transactions and account abstraction
   
�💎 **PRICE DATA**: 
   - Get real-time prices: "What's the price of Bitcoin?"
   
**IMPORTANT NOTES**:
- All operations use the Somnia blockchain network
- Transfers require a private key for security
- I can execute real transactions and return transaction hashes
- Always provide clear addresses and amounts for operations

Available commands:
- Balance check: "Check balance for [address]"
- Transfer: "Transfer [amount] to [address]"
- Swap: "Swap [amount] from [token1] to [token2]"
- Smart account: "Create smart account for [address]"
- Price: "What's the price of [token]?"

How can I help you with blockchain operations today?"""
            
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