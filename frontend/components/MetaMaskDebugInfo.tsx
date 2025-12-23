'use client'

import { useEffect, useState } from 'react'

export function MetaMaskDebugInfo() {
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ethereum = window.ethereum
      
      const info = {
        hasEthereum: !!ethereum,
        isMetaMask: ethereum?.isMetaMask,
        hasMetaMaskObject: !!ethereum?._metamask,
        providers: ethereum?.providers?.length || 0,
        userAgent: navigator.userAgent.includes('MetaMask'),
        version: ethereum?.version || 'unknown',
        chainId: ethereum?.chainId || 'unknown',
        selectedAddress: ethereum?.selectedAddress || 'none',
        isFlask: ethereum?._metamask !== undefined,
        metaMaskObject: ethereum?._metamask ? Object.keys(ethereum._metamask) : [],
      }
      
      setDebugInfo(info)
      
      console.log('MetaMask Debug Info:', info)
    }
  }, [])

  if (!debugInfo) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg p-4 shadow-lg max-w-sm text-xs">
      <h4 className="font-semibold mb-2">MetaMask Debug</h4>
      <div className="space-y-1">
        <div>Has Ethereum: {debugInfo.hasEthereum ? '✅' : '❌'}</div>
        <div>Is MetaMask: {debugInfo.isMetaMask ? '✅' : '❌'}</div>
        <div>Has _metamask: {debugInfo.hasMetaMaskObject ? '✅' : '❌'}</div>
        <div>Providers: {debugInfo.providers}</div>
        <div>UserAgent: {debugInfo.userAgent ? '✅' : '❌'}</div>
        <div>Version: {debugInfo.version}</div>
        <div>Chain: {debugInfo.chainId}</div>
        <div>Address: {debugInfo.selectedAddress}</div>
        <div>Is Flask: {debugInfo.isFlask ? '✅' : '❌'}</div>
        {debugInfo.metaMaskObject.length > 0 && (
          <div>_metamask keys: {debugInfo.metaMaskObject.join(', ')}</div>
        )}
      </div>
    </div>
  )
}

declare global {
  interface Window {
    ethereum?: any
  }
}