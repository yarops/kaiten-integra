import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { InvoiceList } from '../components/InvoiceList'
import { InvoiceDetails } from '../components/InvoiceDetails'

const invoiceDetailsRoute = getRouteApi('/invoices/$invoiceId')

export function InvoicesPage() {
    const navigate = useNavigate()
    return <InvoiceList onSelectInvoice={(invoiceId) => navigate({ to: '/invoices/$invoiceId', params: { invoiceId } })} />
}

export function InvoiceDetailsPage() {
    const { invoiceId } = invoiceDetailsRoute.useParams()
    const navigate = useNavigate()
    return <InvoiceDetails invoiceId={invoiceId} onBack={() => navigate({ to: '/invoices' })} />
}
