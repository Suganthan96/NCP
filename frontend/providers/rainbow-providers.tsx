'use client'

import '@rainbow-me/rainbowkit/styles.css'
import {
  getDefaultWallets,
  RainbowKitProvider,
  lightTheme,
} from '@rainbow-me/rainbowkit'
import { WagmiProvider, createConfig, http } from 'wagmi'
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  sepolia,
} from 'wagmi/chains'
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/react-query'

const { connectors } = getDefaultWallets({
  appName: 'NCP Agents Platform',
  projectId: 'YOUR_PROJECT_ID', // Get this from https://cloud.walletconnect.com
})

const config = createConfig({
  chains: [mainnet, polygon, optimism, arbitrum, sepolia],
  connectors,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(), 
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
  },
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: '#000000',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}