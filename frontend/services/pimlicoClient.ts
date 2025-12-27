import { createPimlicoClient } from "permissionless/clients/pimlico";
import { http } from "viem";

const pimlicoKey = process.env.NEXT_PUBLIC_PIMLICO_API_KEY;

if (!pimlicoKey) {
  console.warn("Pimlico API key is not set. Gas estimation will not work.");
}

/**
 * Pimlico client instance configured for the specified chain
 * Used for estimating gas prices (maxFeePerGas, maxPriorityFeePerGas) for sending a UserOperation
 */
export const pimlicoClientFactory = (chainId: number) => {
  if (!pimlicoKey) {
    throw new Error("Pimlico API key is required for gas estimation");
  }
  
  return createPimlicoClient({
    transport: http(
      `https://api.pimlico.io/v2/${chainId}/rpc?apikey=${pimlicoKey}`
    ),
  });
};
