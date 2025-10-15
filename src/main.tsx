import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { initKaitenClient } from './api/kaiten-client'
import './index.css'

// Initialize Kaiten API client from environment variables.
const apiUrl = import.meta.env.VITE_KAITEN_API_URL
const apiToken = import.meta.env.VITE_KAITEN_API_TOKEN

if (!apiUrl || !apiToken) {
    console.error(
        'VITE_KAITEN_API_URL and VITE_KAITEN_API_TOKEN must be set in .env.local file'
    )
} else {
    initKaitenClient({ apiUrl, apiToken })
}

// Create a client for TanStack Query.
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 5 * 60 * 1000, // 5 minutes.
        },
    },
})

ReactDOM.createRoot(document.getElementById('kaiten-app')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </React.StrictMode>,
)

