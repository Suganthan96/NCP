import { NextRequest, NextResponse } from "next/server";
import { 
  createPublicClient, 
  http, 
  formatEther, 
  parseEther,
  isAddress 
} from "viem";
import { sepolia } from "viem/chains";

// Sepolia testnet configuration
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

interface NativeTokenRequest {
  action: "getBalance" | "transfer" | "getGasPrice" | "estimateGas";
  walletAddress?: string;
  toAddress?: string;
  amount?: string; // In ETH
  gasLimit?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const walletAddress = searchParams.get("walletAddress");
  const toAddress = searchParams.get("toAddress");
  const amount = searchParams.get("amount");

  try {
    if (action === "getBalance" && walletAddress) {
      return await getETHBalance(walletAddress);
    }

    if (action === "getGasPrice") {
      return await getGasPrice();
    }

    if (action === "estimateGas" && toAddress && amount) {
      return await estimateTransferGas(toAddress, amount);
    }

    return NextResponse.json(
      { success: false, error: "Invalid action or missing parameters" },
      { status: 400 }
    );

  } catch (error) {
    console.error("❌ Native Token API error:", error);
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
    const body: NativeTokenRequest = await request.json();
    const { action } = body;

    if (action === "getBalance" && body.walletAddress) {
      return await getETHBalance(body.walletAddress);
    }

    if (action === "transfer") {
      return await handleETHTransfer(body);
    }

    if (action === "getGasPrice") {
      return await getGasPrice();
    }

    if (action === "estimateGas" && body.toAddress && body.amount) {
      return await estimateTransferGas(body.toAddress, body.amount);
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    console.error("❌ Native Token API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

async function getETHBalance(walletAddress: string) {
  if (!isAddress(walletAddress)) {
    return NextResponse.json(
      { success: false, error: "Invalid wallet address" },
      { status: 400 }
    );
  }

  try {
    const balance = await publicClient.getBalance({
      address: walletAddress as `0x${string}`,
    });

    const formattedBalance = formatEther(balance);

    console.log(`💰 ETH Balance:`);
    console.log(`Wallet: ${walletAddress}`);
    console.log(`Balance: ${formattedBalance} ETH`);

    return NextResponse.json({
      success: true,
      result: {
        walletAddress,
        balance: formattedBalance,
        balanceWei: balance.toString(),
        symbol: "ETH",
        decimals: 18,
        network: "sepolia",
        chainId: sepolia.id,
      }
    });

  } catch (error) {
    console.error("❌ Failed to get ETH balance:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get ETH balance: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}

async function handleETHTransfer(body: NativeTokenRequest) {
  const { walletAddress, toAddress, amount, gasLimit } = body;

  if (!toAddress || !amount) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: toAddress and amount" },
      { status: 400 }
    );
  }

  if (!isAddress(toAddress)) {
    return NextResponse.json(
      { success: false, error: "Invalid recipient address" },
      { status: 400 }
    );
  }

  try {
    const amountWei = parseEther(amount);
    
    // For demo purposes, simulate a successful ETH transfer
    const simulatedTxHash = `0x${Math.random().toString(16).substring(2).padStart(64, '0')}`;
    
    console.log(`💰 Native ETH Transfer Simulated:`);
    console.log(`From: ${walletAddress || "Smart Account"}`);
    console.log(`To: ${toAddress}`);
    console.log(`Amount: ${amount} ETH (${amountWei} wei)`);
    console.log(`Gas Limit: ${gasLimit || "21000"}`);
    console.log(`Transaction hash: ${simulatedTxHash}`);

    return NextResponse.json({
      success: true,
      result: {
        txHash: simulatedTxHash,
        from: walletAddress || "Smart Account",
        to: toAddress,
        amount,
        amountWei: amountWei.toString(),
        gasLimit: gasLimit || "21000",
        gasUsed: "21000",
        status: "success",
        network: "sepolia",
        chainId: sepolia.id,
      }
    });

  } catch (error) {
    console.error("❌ ETH transfer failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `ETH transfer failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}

async function getGasPrice() {
  try {
    const gasPrice = await publicClient.getGasPrice();
    const gasPriceGwei = formatEther(gasPrice * BigInt(1000000000)); // Convert to Gwei

    console.log(`⛽ Current Gas Price: ${gasPriceGwei} Gwei`);

    return NextResponse.json({
      success: true,
      result: {
        gasPrice: gasPrice.toString(),
        gasPriceGwei,
        network: "sepolia",
        chainId: sepolia.id,
      }
    });

  } catch (error) {
    console.error("❌ Failed to get gas price:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get gas price: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}

async function estimateTransferGas(toAddress: string, amount: string) {
  if (!isAddress(toAddress)) {
    return NextResponse.json(
      { success: false, error: "Invalid recipient address" },
      { status: 400 }
    );
  }

  try {
    const amountWei = parseEther(amount);
    
    // For ETH transfers, gas is typically 21,000
    const estimatedGas = BigInt(21000);
    const gasPrice = await publicClient.getGasPrice();
    const estimatedFee = estimatedGas * gasPrice;
    const estimatedFeeETH = formatEther(estimatedFee);

    console.log(`⛽ Gas Estimation:`);
    console.log(`To: ${toAddress}`);
    console.log(`Amount: ${amount} ETH`);
    console.log(`Estimated Gas: ${estimatedGas.toString()}`);
    console.log(`Estimated Fee: ${estimatedFeeETH} ETH`);

    return NextResponse.json({
      success: true,
      result: {
        toAddress,
        amount,
        estimatedGas: estimatedGas.toString(),
        gasPrice: gasPrice.toString(),
        estimatedFee: estimatedFeeETH,
        estimatedFeeWei: estimatedFee.toString(),
        network: "sepolia",
      }
    });

  } catch (error) {
    console.error("❌ Gas estimation failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Gas estimation failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}