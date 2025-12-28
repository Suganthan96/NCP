/**
 * Token contract addresses for different networks
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  addresses: {
    [chainId: number]: string;
  };
}

export const TOKEN_LIST: Record<string, TokenInfo> = {
  'USDC': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
      11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
      42161: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Arbitrum
    },
  },
  'USDT': {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    addresses: {
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum Mainnet
      11155111: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia
      137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon
      42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum
    },
  },
  'DAI': {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    addresses: {
      1: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Ethereum Mainnet
      11155111: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // Sepolia
      137: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // Polygon
      42161: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // Arbitrum
    },
  },
  'WETH': {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    addresses: {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum Mainnet
      11155111: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // Sepolia
      137: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // Polygon
      42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Arbitrum
    },
  },
  'LINK': {
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    addresses: {
      1: '0x514910771AF9Ca656af840dff83E8264EcF986CA', // Ethereum Mainnet
      11155111: '0x779877A7B0D9E8603169DdbD7836e478b4624789', // Sepolia
      137: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39', // Polygon
      42161: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4', // Arbitrum
    },
  },
  'UNI': {
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
    addresses: {
      1: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // Ethereum Mainnet
      11155111: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // Sepolia
      137: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f', // Polygon
      42161: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0', // Arbitrum
    },
  },
};

export const SUPPORTED_TOKENS = Object.keys(TOKEN_LIST);

/**
 * Get token contract address for a specific chain
 */
export function getTokenAddress(symbol: string, chainId: number): string | undefined {
  const token = TOKEN_LIST[symbol.toUpperCase()];
  return token?.addresses[chainId];
}

/**
 * Get token decimals
 */
export function getTokenDecimals(symbol: string): number {
  const token = TOKEN_LIST[symbol.toUpperCase()];
  return token?.decimals || 18; // Default to 18 if not found
}

/**
 * Get token info
 */
export function getTokenInfo(symbol: string): TokenInfo | undefined {
  return TOKEN_LIST[symbol.toUpperCase()];
}
