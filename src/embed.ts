import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { initKaitenClient } from './api/kaiten-client'
import './index.css'

/**
 * Configuration for embedding the Kaiten app.
 */
export interface EmbedConfig {
    containerId?: string
    apiUrl: string
    apiToken: string
}

/**
 * Initialize and mount the Kaiten Integration app.
 */
export const initKaitenApp = (config: EmbedConfig): ReactDOM.Root => {
    const containerId = config.containerId || 'kaiten-app'
    const container = document.getElementById(containerId)

    if (!container) {
        throw new Error(`Container element with id "${containerId}" not found.`)
    }

    // Initialize Kaiten API client.
    initKaitenClient({
        apiUrl: config.apiUrl,
        apiToken: config.apiToken,
    })

    // Create TanStack Query client.
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnWindowFocus: false,
                retry: 1,
                staleTime: 5 * 60 * 1000, // 5 minutes.
            },
        },
    })

    // Mount the app.
    const root = ReactDOM.createRoot(container)
    root.render(
        React.createElement(
            React.StrictMode,
            null,
            React.createElement(QueryClientProvider, { client: queryClient }, React.createElement(App))
        )
    )

    return root
}

/**
 * Global API for embedding.
 */
if (typeof window !== 'undefined') {
    ; (window as any).KaitenApp = {
        init: initKaitenApp,
    }
}

