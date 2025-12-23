'use client'

import { useEffect, useState } from 'react'

export function useMetaMaskFlask() {
  const [isFlaskAvailable, setIsFlaskAvailable] = useState(false)
  const [isMetaMaskAvailable, setIsMetaMaskAvailable] = useState(false)

  useEffect(() => {
    const checkMetaMask = () => {
      if (typeof window !== 'undefined') {
        const ethereum = window.ethereum
        
        if (ethereum) {
          setIsMetaMaskAvailable(true)
          
          // Multiple ways to detect Flask
          const flaskIndicators = [
            // Flask usually has additional experimental features
            ethereum._metamask !== undefined,
            // Flask might have different version patterns
            ethereum.version && ethereum.version.includes('flask'),
            // Flask has experimental method support
            typeof ethereum.request === 'function',
            // Check for Flask-specific properties
            ethereum.isFlask === true,
            // Flask often has additional provider methods
            ethereum._metamask?.isUnlocked !== undefined
          ]
          
          const isFlask = flaskIndicators.some(indicator => indicator === true)
          setIsFlaskAvailable(isFlask)
          
          // Log detection details
          console.log('MetaMask Detection:', {
            isMetaMask: ethereum.isMetaMask,
            version: ethereum.version,
            hasMetaMaskObject: !!ethereum._metamask,
            flaskIndicators,
            detectedAsFlask: isFlask
          })
        } else {
          setIsMetaMaskAvailable(false)
          setIsFlaskAvailable(false)
        }
      }
    }

    checkMetaMask()
    
    // Listen for provider changes
    if (typeof window !== 'undefined') {
      const handleEthereumEvents = () => {
        setTimeout(checkMetaMask, 100)
      }
      
      // Multiple event listeners for different scenarios
      window.addEventListener('ethereum#initialized', handleEthereumEvents)
      document.addEventListener('DOMContentLoaded', handleEthereumEvents)
      
      // Periodic check for delayed injection
      const intervalId = setInterval(checkMetaMask, 2000)
      
      // Cleanup after 10 seconds
      setTimeout(() => clearInterval(intervalId), 10000)
      
      return () => {
        window.removeEventListener('ethereum#initialized', handleEthereumEvents)
        document.removeEventListener('DOMContentLoaded', handleEthereumEvents)
        clearInterval(intervalId)
      }
    }
  }, [])

  return { isFlaskAvailable, isMetaMaskAvailable }
}

// Type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}