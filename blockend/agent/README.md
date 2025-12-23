# NCP AI Agent Builder with Groq

A powerful Web3 AI agent system built with FastAPI and Groq AI that enables automated blockchain operations and workflow execution.

## Features

- 🤖 **Groq-Powered AI**: Uses Groq's fast LLM inference for intelligent Web3 operations
- ⛓️ **Web3 Integration**: Supports ERC-4337, ERC-20, ERC-721, DeFi operations
- 🔧 **Workflow Builder**: Connect tools in sequences for complex operations
- 💻 **Code Generation**: Generate Python code from workflow descriptions
- 🛡️ **Secure**: Private key handling and transaction validation
- 📊 **Analytics**: Wallet analysis and transaction monitoring

## Available Tools

### Account Abstraction
- **erc4337**: Smart account creation and management

### Wallet Operations  
- **wallet_balance**: Check ETH and token balances
- **wallet_analytics**: Analyze transaction history and holdings

### Token Operations
- **erc20_tokens**: ERC-20 token transfers, approvals, and queries
- **transfer**: Transfer ETH or tokens between addresses

### NFT Operations
- **erc721_nft**: NFT minting, transferring, and metadata management

### DeFi Operations
- **swap**: Token swapping via DEX protocols
- **fetch_price**: Real-time cryptocurrency price data

## Quick Start

### 1. Installation

```bash
# Clone the repository
cd blockend/agent

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start the Server

```bash
python main.py
```

The API will be available at `http://localhost:8000`

### 3. API Documentation

Visit `http://localhost:8000/docs` for interactive API documentation.

## Usage Examples

### Simple Balance Check

```python
import requests

response = requests.post("http://localhost:8000/agent/chat", json={
    "tools": [{"tool": "wallet_balance"}],
    "user_message": "Check balance for 0x742c2E1d07Eb7D7F3e5f1e3e8e8d1c4a5b6c7d8e"
})

print(response.json()["agent_response"])
```

### Multi-Step Workflow

```python
response = requests.post("http://localhost:8000/agent/chat", json={
    "tools": [
        {"tool": "erc4337", "next_tool": "wallet_balance"},
        {"tool": "wallet_balance", "next_tool": "transfer"}, 
        {"tool": "transfer"}
    ],
    "user_message": "Create smart account, check balance, transfer 0.1 ETH",
    "private_key": "your_private_key"
})
```

### Code Generation

```python
response = requests.post("http://localhost:8000/agent/generate-code", json={
    "workflow_description": "Deploy ERC-20 token and airdrop to 100 addresses",
    "tools_used": ["erc20_tokens", "transfer"],
    "programming_language": "python"
})

print(response.json()["generated_code"])
```

## API Endpoints

### POST /agent/chat
Execute Web3 workflows using natural language.

**Request:**
```json
{
    "tools": [
        {"tool": "wallet_balance", "next_tool": "transfer"}
    ],
    "user_message": "Check my balance and send 0.1 ETH to Alice",
    "private_key": "optional_private_key",
    "context": {"network": "ethereum"}
}
```

**Response:**
```json
{
    "agent_response": "I'll check your balance and send ETH...",
    "tool_calls": [{"tool": "wallet_balance", "parameters": {...}}],
    "results": [{"success": true, "result": {...}}],
    "workflow_summary": "✅ Executed 2 operations successfully"
}
```

### POST /agent/generate-code
Generate code from workflow descriptions.

**Request:**
```json
{
    "workflow_description": "Create a token swap application",
    "tools_used": ["fetch_price", "swap"],
    "programming_language": "python"
}
```

### GET /tools
List all available tools and their parameters.

### GET /health
Check API health and status.

## Testing

Run the comprehensive test suite:

```bash
python test_agent.py
```

This will test:
- Basic API functionality
- Simple agent interactions  
- Multi-step workflows
- NFT operations
- DeFi workflows
- Code generation

## Configuration

### Environment Variables

```env
# Required
GROQ_API_KEY=your_groq_api_key

# Optional - for real Web3 integrations
ALCHEMY_API_KEY=your_alchemy_key
INFURA_API_KEY=your_infura_key
```

### Groq API Key
Get your API key from [Groq Console](https://console.groq.com/)

## Workflow Examples

### 1. Smart Account Setup
```json
{
    "tools": [
        {"tool": "erc4337", "next_tool": "wallet_balance"},
        {"tool": "wallet_balance"}
    ],
    "user_message": "Set up a new smart account and check its balance"
}
```

### 2. Token Airdrop
```json
{
    "tools": [
        {"tool": "erc20_tokens", "next_tool": "transfer"},
        {"tool": "transfer"}
    ],
    "user_message": "Deploy a token and airdrop 100 tokens to 5 addresses"
}
```

### 3. NFT Collection
```json
{
    "tools": [
        {"tool": "erc721_nft", "next_tool": "wallet_analytics"},
        {"tool": "wallet_analytics"}
    ],
    "user_message": "Mint NFTs and analyze the collection"
}
```

### 4. DeFi Strategy
```json
{
    "tools": [
        {"tool": "fetch_price", "next_tool": "swap"},
        {"tool": "swap", "next_tool": "wallet_analytics"},
        {"tool": "wallet_analytics"}
    ],
    "user_message": "Check prices, execute swaps, and analyze portfolio"
}
```

## Security Notes

- Private keys are handled securely and never logged
- All transactions are simulated by default for safety
- Input validation prevents malicious operations
- Rate limiting and error handling included

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   FastAPI       │────│   Groq AI       │
│   (React)       │    │   Backend       │    │   (LLM)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   Web3 APIs     │
                       │   (Blockchain)  │
                       └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.