import { NextRequest, NextResponse } from "next/server";
import { 
  createPublicClient, 
  http, 
  getContract,
  formatUnits,
  parseUnits,
  isAddress 
} from "viem";
import { sepolia } from "viem/chains";
import { TOKEN_LIST } from "@/lib/token-addresses";

// ERC20 ABI for basic operations
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Sepolia testnet configuration
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

interface ERC20Request {
  action: "getBalance" | "getTokenInfo" | "getTokenList" | "transfer" | "approve";
  tokenAddress?: string;
  walletAddress?: string;
  spenderAddress?: string;
  amount?: string;
  decimals?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const walletAddress = searchParams.get("walletAddress");
  const tokenAddress = searchParams.get("tokenAddress");

  try {
    if (action === "getTokenList") {
      return getTokenList();
    }

    if (action === "getBalance" && walletAddress && tokenAddress) {
      return await getTokenBalance(tokenAddress, walletAddress);
    }

    if (action === "getTokenInfo" && tokenAddress) {
      return await getTokenInfo(tokenAddress);
    }

    return NextResponse.json(
      { success: false, error: "Invalid action or missing parameters" },
      { status: 400 }
    );

  } catch (error) {
    console.error("❌ ERC20 API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ERC20Request = await request.json();
    const { action } = body;

    if (action === "getBalance" && body.tokenAddress && body.walletAddress) {
      return await getTokenBalance(body.tokenAddress, body.walletAddress);
    }

    if (action === "getTokenInfo" && body.tokenAddress) {
      return await getTokenInfo(body.tokenAddress);
    }

    if (action === "transfer") {
      return await handleTokenTransfer(body);
    }

    if (action === "approve") {
      return await handleTokenApproval(body);
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    console.error("❌ ERC20 API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

async function getTokenList() {
  const sepoliaChainId = 11155111;
  const sepoliaTokens = Object.entries(TOKEN_LIST)
    .filter(([_, tokenInfo]) => tokenInfo.addresses[sepoliaChainId])
    .map(([key, tokenInfo]) => ({
      symbol: tokenInfo.symbol,
      name: tokenInfo.name,
      decimals: tokenInfo.decimals,
      address: tokenInfo.addresses[sepoliaChainId],
    }));

  return NextResponse.json({
    success: true,
    result: {
      network: "sepolia",
      chainId: sepoliaChainId,
      tokens: sepoliaTokens,
    }
  });
}

async function getTokenBalance(tokenAddress: string, walletAddress: string) {
  if (!isAddress(tokenAddress) || !isAddress(walletAddress)) {
    return NextResponse.json(
      { success: false, error: "Invalid token or wallet address" },
      { status: 400 }
    );
  }

  try {
    const contract = getContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      client: publicClient,
    });

    const [balance, symbol, decimals] = await Promise.all([
      contract.read.balanceOf([walletAddress as `0x${string}`]),
      contract.read.symbol(),
      contract.read.decimals(),
    ]);

    const formattedBalance = formatUnits(balance, decimals);

    console.log(`💰 Token Balance:`);
    console.log(`Token: ${tokenAddress} (${symbol})`);
    console.log(`Wallet: ${walletAddress}`);
    console.log(`Balance: ${formattedBalance} ${symbol}`);

    return NextResponse.json({
      success: true,
      result: {
        tokenAddress,
        walletAddress,
        balance: formattedBalance,
        balanceRaw: balance.toString(),
        symbol,
        decimals,
      }
    });

  } catch (error) {
    console.error("❌ Failed to get token balance:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get token balance: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}

async function getTokenInfo(tokenAddress: string) {
  if (!isAddress(tokenAddress)) {
    return NextResponse.json(
      { success: false, error: "Invalid token address" },
      { status: 400 }
    );
  }

  try {
    const contract = getContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      client: publicClient,
    });

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.read.name(),
      contract.read.symbol(),
      contract.read.decimals(),
      contract.read.totalSupply(),
    ]);

    const formattedSupply = formatUnits(totalSupply, decimals);

    return NextResponse.json({
      success: true,
      result: {
        address: tokenAddress,
        name,
        symbol,
        decimals,
        totalSupply: formattedSupply,
        totalSupplyRaw: totalSupply.toString(),
      }
    });

  } catch (error) {
    console.error("❌ Failed to get token info:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get token info: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}

async function handleTokenTransfer(body: ERC20Request) {
  const { tokenAddress, walletAddress, amount, decimals } = body;

  if (!tokenAddress || !walletAddress || !amount) {
    return NextResponse.json(
      { success: false, error: "Missing required fields for token transfer" },
      { status: 400 }
    );
  }

  try {
    // For demo purposes, simulate a successful token transfer
    const simulatedTxHash = `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`;
    
    console.log(`🪙 ERC20 Token Transfer Simulated:`);
    console.log(`Token: ${tokenAddress}`);
    console.log(`To: ${walletAddress}`);
    console.log(`Amount: ${amount} tokens`);
    console.log(`Transaction hash: ${simulatedTxHash}`);

    return NextResponse.json({
      success: true,
      result: {
        txHash: simulatedTxHash,
        tokenAddress,
        to: walletAddress,
        amount,
        status: "success",
        network: "sepolia",
      }
    });

  } catch (error) {
    console.error("❌ Token transfer failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Token transfer failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}

async function handleTokenApproval(body: ERC20Request) {
  const { tokenAddress, spenderAddress, amount } = body;

  if (!tokenAddress || !spenderAddress || !amount) {
    return NextResponse.json(
      { success: false, error: "Missing required fields for token approval" },
      { status: 400 }
    );
  }

  try {
    // For demo purposes, simulate a successful token approval
    const simulatedTxHash = `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`;
    
    console.log(`✅ ERC20 Token Approval Simulated:`);
    console.log(`Token: ${tokenAddress}`);
    console.log(`Spender: ${spenderAddress}`);
    console.log(`Amount: ${amount} tokens`);
    console.log(`Transaction hash: ${simulatedTxHash}`);

    return NextResponse.json({
      success: true,
      result: {
        txHash: simulatedTxHash,
        tokenAddress,
        spender: spenderAddress,
        amount,
        status: "success",
        network: "sepolia",
      }
    });

  } catch (error) {
    console.error("❌ Token approval failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Token approval failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}