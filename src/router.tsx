import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import App from './App'
import { CardsPage } from './pages/Cards'
import { InvoiceDetailsPage, InvoicesPage } from './pages/Invoices'
import { validateCardsSearch } from './lib/cards-search'

const rootRoute = createRootRoute({
    component: App,
    notFoundComponent: () => <p className="info-message">Page not found.</p>,
})

const cardsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    validateSearch: validateCardsSearch,
    component: CardsPage,
})

const invoicesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/invoices',
    component: InvoicesPage,
})

const invoiceDetailsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/invoices/$invoiceId',
    component: InvoiceDetailsPage,
})

const routeTree = rootRoute.addChildren([cardsRoute, invoicesRoute, invoiceDetailsRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}
