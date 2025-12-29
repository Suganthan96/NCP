import { NextRequest, NextResponse } from "next/server";
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  parseEther, 
  parseUnits,
  formatEther,
  isAddress,
  encodeFunctionData,
  keccak256,
  toHex
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { 
  Implementation,
  toMetaMaskSmartAccount 
} from "@metamask/smart-accounts-kit";
import {
  createBundlerClient,
  createPaymasterClient,
} from "viem/account-abstraction";

// Sepolia testnet configuration
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.ankr.com/eth_sepolia'),
});

// Pimlico configuration
const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;

if (!pimlicoKey) {
  console.warn("⚠️ Pimlico API key is not set. Paymaster sponsorship will not work.");
}

const bundlerClient = createBundlerClient({
  client: publicClient,
  transport: http(
    `https://api.pimlico.io/v2/11155111/rpc?apikey=${pimlicoKey}`
  ),
});

const paymasterClient = createPaymasterClient({
  transport: http(
    `https://api.pimlico.io/v2/11155111/rpc?apikey=${pimlicoKey}`
  ),
});

interface TransferRequest {
  fromAddress: string; // Smart account address
  toAddress: string;
  amount: string; // In ETH for native, or token amount for ERC-20
  tokenType?: "ETH" | "ERC20";
  tokenAddress?: string; // For ERC20 transfers
  tokenDecimals?: number; // For ERC20 transfers
  userAddress: string; // Connected wallet address (EOA) - owner of smart account
  nodeId: string; // Node ID used as salt for smart account creation
}

export async function POST(request: NextRequest) {
  try {
    const body: TransferRequest = await request.json();
    
    console.log('📨 Transfer request received:', {
      from: body.fromAddress,
      to: body.toAddress,
      amount: body.amount,
      tokenType: body.tokenType || 'ETH',
      userAddress: body.userAddress,
      nodeId: body.nodeId
    });

    // Validate required fields
    if (!body.fromAddress || !body.toAddress || !body.amount || !body.nodeId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: fromAddress, toAddress, amount, nodeId" },
        { status: 400 }
      );
    }

    // Validate addresses
    if (!isAddress(body.toAddress) || !isAddress(body.fromAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid addresses provided" },
        { status: 400 }
      );
    }

    const { tokenType = "ETH" } = body;

    if (tokenType === "ETH") {
      return await handleETHTransfer(body);
    } else if (tokenType === "ERC20") {
      return await handleERC20Transfer(body);
    } else {
      return NextResponse.json(
        { success: false, error: "Unsupported token type" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("❌ Transfer API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown transfer error" 
      },
      { status: 500 }
    );
  }
}

async function handleETHTransfer(body: TransferRequest) {
  const { fromAddress, toAddress, amount, nodeId } = body;

  try {
    const amountWei = parseEther(amount);
    
    console.log(`💰 Preparing ETH Transfer:`);
    console.log(`├─ Smart Account: ${fromAddress}`);
    console.log(`├─ Recipient: ${toAddress}`);
    console.log(`├─ Amount: ${amount} ETH`);
    console.log(`└─ Node ID (salt): ${nodeId}`);

    // Return transaction data for frontend to execute
    // The frontend has access to the user's wallet and can sign the UserOperation
    return NextResponse.json({
      success: true,
      result: {
        type: "ETH",
        from: fromAddress,
        to: toAddress,
        amount: amount,
        amountWei: amountWei.toString(),
        nodeId: nodeId,
        data: "0x", // Native ETH transfer has no data
        message: "Transaction data prepared. Execute this transfer from the frontend using the user's wallet to sign the UserOperation."
      }
    });

  } catch (error) {
    console.error("❌ ETH transfer preparation failed:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: `ETH transfer failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}

async function handleERC20Transfer(body: TransferRequest) {
  const { fromAddress, toAddress, amount, tokenAddress, tokenDecimals = 18, nodeId } = body;

  if (!tokenAddress) {
    return NextResponse.json(
      { success: false, error: "Token address required for ERC20 transfers" },
      { status: 400 }
    );
  }

  try {
    const amountWei = parseUnits(amount, tokenDecimals);
    
    console.log(`🪙 Preparing ERC-20 Transfer:`);
    console.log(`├─ Smart Account: ${fromAddress}`);
    console.log(`├─ Token: ${tokenAddress}`);
    console.log(`├─ Recipient: ${toAddress}`);
    console.log(`├─ Amount: ${amount} tokens (${amountWei} raw)`);
    console.log(`└─ Node ID (salt): ${nodeId}`);

    // Encode ERC-20 transfer function call
    const transferCalldata = encodeFunctionData({
      abi: [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }
      ],
      functionName: 'transfer',
      args: [toAddress as `0x${string}`, amountWei]
    });

    // Return transaction data for frontend to execute
    return NextResponse.json({
      success: true,
      result: {
        type: "ERC20",
        from: fromAddress,
        to: tokenAddress, // For ERC-20, we call the token contract
        recipient: toAddress, // Actual recipient is in the calldata
        amount: amount,
        amountWei: amountWei.toString(),
        nodeId: nodeId,
        data: transferCalldata,
        tokenAddress: tokenAddress,
        tokenDecimals: tokenDecimals,
        message: "Transaction data prepared. Execute this transfer from the frontend using the user's wallet to sign the UserOperation."
      }
    });

  } catch (error) {
    console.error("❌ ERC-20 transfer preparation failed:", error);
      { 
        success: false, 
        error: `ERC-20 transfer failed: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}
