import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import { DialogProvider } from './components/dialogs/DialogProvider'
import { AuthGate } from './components/AuthGate'
import './index.css'

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

ReactDOM.createRoot(document.getElementById('app')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <DialogProvider>
                <AuthGate>
                    <RouterProvider router={router} />
                </AuthGate>
            </DialogProvider>
        </QueryClientProvider>
    </React.StrictMode>,
)
