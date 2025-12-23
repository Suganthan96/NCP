"""
Test script for NCP AI Agent Builder
Demonstrates how to use the Groq-powered Web3 agent
"""

import requests
import json

# API base URL
BASE_URL = "http://localhost:8000"

def test_health():
    """Test the health endpoint"""
    response = requests.get(f"{BASE_URL}/health")
    print("Health Check:", response.json())

def test_tools():
    """Test the tools listing"""
    response = requests.get(f"{BASE_URL}/tools")
    data = response.json()
    print("\nAvailable Tools:")
    for tool in data["tools"]:
        print(f"- {tool}")

def test_simple_agent():
    """Test simple agent interaction"""
    payload = {
        "tools": [
            {"tool": "wallet_balance"}
        ],
        "user_message": "Check the balance for wallet address 0x742c2E1d07Eb7D7F3e5f1e3e8e8d1c4a5b6c7d8e",
        "context": {
            "network": "ethereum",
            "user_preference": "detailed"
        }
    }
    
    response = requests.post(f"{BASE_URL}/agent/chat", json=payload)
    data = response.json()
    
    print("\n" + "="*60)
    print("SIMPLE AGENT TEST")
    print("="*60)
    print("Agent Response:", data["agent_response"])
    print("Tool Calls:", len(data["tool_calls"]))
    print("Workflow Summary:", data["workflow_summary"])

def test_workflow_agent():
    """Test workflow with multiple connected tools"""
    payload = {
        "tools": [
            {"tool": "erc4337", "next_tool": "wallet_balance"},
            {"tool": "wallet_balance", "next_tool": "transfer"},
            {"tool": "transfer"}
        ],
        "user_message": "Create a smart account, check its balance, and then transfer 0.1 ETH to 0x123...456",
        "private_key": "dummy_private_key_for_testing",
        "context": {
            "network": "ethereum",
            "gas_preference": "standard"
        }
    }
    
    response = requests.post(f"{BASE_URL}/agent/chat", json=payload)
    data = response.json()
    
    print("\n" + "="*60)
    print("WORKFLOW AGENT TEST")
    print("="*60)
    print("Agent Response:", data["agent_response"])
    print("Tool Calls Executed:", len(data["tool_calls"]))
    print("Workflow Summary:")
    print(data["workflow_summary"])
    
    print("\nDetailed Tool Execution:")
    for i, (call, result) in enumerate(zip(data["tool_calls"], data["results"])):
        print(f"{i+1}. {call['tool']} -> {result['success']}")

def test_code_generation():
    """Test code generation feature"""
    payload = {
        "workflow_description": "Create a Web3 workflow that deploys an ERC-20 token, checks wallet balance, and transfers tokens to multiple recipients",
        "tools_used": ["erc20_tokens", "wallet_balance", "transfer"],
        "programming_language": "python"
    }
    
    response = requests.post(f"{BASE_URL}/agent/generate-code", json=payload)
    data = response.json()
    
    print("\n" + "="*60)
    print("CODE GENERATION TEST")
    print("="*60)
    print("Explanation:", data["explanation"])
    print("\nDependencies:", data["dependencies"])
    print("\nGenerated Code:")
    print("-" * 40)
    print(data["generated_code"])

def test_nft_workflow():
    """Test NFT-focused workflow"""
    payload = {
        "tools": [
            {"tool": "erc721_nft", "next_tool": "wallet_analytics"},
            {"tool": "wallet_analytics"}
        ],
        "user_message": "Mint an NFT and then analyze the wallet to see all NFT holdings",
        "private_key": "dummy_private_key_for_testing",
        "context": {
            "nft_collection": "0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D",  # BAYC
            "metadata": {
                "name": "Test NFT",
                "description": "Generated via NCP Agent"
            }
        }
    }
    
    response = requests.post(f"{BASE_URL}/agent/chat", json=payload)
    data = response.json()
    
    print("\n" + "="*60)
    print("NFT WORKFLOW TEST")
    print("="*60)
    print("Agent Response:", data["agent_response"])
    print("Workflow Summary:", data["workflow_summary"])

def test_defi_workflow():
    """Test DeFi-focused workflow"""
    payload = {
        "tools": [
            {"tool": "fetch_price", "next_tool": "swap"},
            {"tool": "swap", "next_tool": "wallet_balance"},
            {"tool": "wallet_balance"}
        ],
        "user_message": "Check ETH price, swap 1 ETH for USDC, then check my new balance",
        "private_key": "dummy_private_key_for_testing",
        "context": {
            "slippage_tolerance": "0.5",
            "dex_preference": "uniswap"
        }
    }
    
    response = requests.post(f"{BASE_URL}/agent/chat", json=payload)
    data = response.json()
    
    print("\n" + "="*60)
    print("DeFi WORKFLOW TEST")
    print("="*60)
    print("Agent Response:", data["agent_response"])
    print("Workflow Summary:", data["workflow_summary"])

if __name__ == "__main__":
    print("NCP AI Agent Builder - Test Suite")
    print("Starting tests...")
    
    try:
        # Basic tests
        test_health()
        test_tools()
        
        # Agent interaction tests
        test_simple_agent()
        test_workflow_agent()
        
        # Specialized workflow tests
        test_nft_workflow()
        test_defi_workflow()
        
        # Code generation test
        test_code_generation()
        
        print("\n" + "="*60)
        print("ALL TESTS COMPLETED")
        print("="*60)
        
    except requests.exceptions.ConnectionError:
        print("\nERROR: Could not connect to the agent API.")
        print("Make sure the server is running with: python main.py")
    except Exception as e:
        print(f"\nERROR: {str(e)}")