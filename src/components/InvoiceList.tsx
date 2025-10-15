import { useState } from 'react'
import { useInvoices, useDeleteInvoice, useUpdateInvoiceStatus } from '../api/invoices'
import './InvoiceList.css'

interface InvoiceListProps {
    onSelectInvoice: (invoiceId: string) => void
}

/**
 * Formats time spent in minutes to a human-readable format.
 */
const formatTimeSpent = (minutes?: number): string => {
    if (!minutes) return '—'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
}

/**
 * Returns status badge class based on status.
 */
const getStatusClass = (status: string): string => {
    switch (status) {
        case 'draft':
            return 'status-draft'
        case 'sent':
            return 'status-sent'
        case 'paid':
            return 'status-paid'
        default:
            return ''
    }
}

/**
 * Returns status label.
 */
const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'draft':
            return 'Draft'
        case 'sent':
            return 'Sent'
        case 'paid':
            return 'Paid'
        default:
            return status
    }
}

export const InvoiceList = ({ onSelectInvoice }: InvoiceListProps) => {
    const { data: invoices, isLoading } = useInvoices()
    const deleteInvoiceMutation = useDeleteInvoice()
    const updateStatusMutation = useUpdateInvoiceStatus()
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (invoiceId: string) => {
        if (!confirm('Are you sure you want to delete this invoice?')) return

        setDeletingId(invoiceId)
        try {
            await deleteInvoiceMutation.mutateAsync(invoiceId)
        } catch (error) {
            console.error('Error deleting invoice:', error)
            alert('Failed to delete invoice')
        } finally {
            setDeletingId(null)
        }
    }

    const handleStatusChange = async (invoiceId: string, status: 'draft' | 'sent' | 'paid') => {
        try {
            await updateStatusMutation.mutateAsync({ invoiceId, status })
        } catch (error) {
            console.error('Error updating invoice status:', error)
            alert('Failed to update invoice status')
        }
    }

    if (isLoading) {
        return <p className="info-message">Loading invoices...</p>
    }

    if (!invoices || invoices.length === 0) {
        return <p className="info-message">No invoices found. Create your first invoice!</p>
    }

    return (
        <div className="invoice-list-container">
            <div className="invoice-cards">
                {invoices.map((invoice) => (
                    <div key={invoice.id} className="invoice-card">
                        <div className="invoice-card-header">
                            <div className="invoice-card-title">
                                <h3>{invoice.board_title || 'Untitled Board'}</h3>
                                <span className="invoice-card-space">
                                    {invoice.space_title || 'Untitled Space'}
                                </span>
                            </div>
                            <div className={`status-badge ${getStatusClass(invoice.status)}`}>
                                {getStatusLabel(invoice.status)}
                            </div>
                        </div>

                        <div className="invoice-card-stats">
                            <div className="stat">
                                <span className="stat-label">Cards:</span>
                                <span className="stat-value">{invoice.total_cards}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Time:</span>
                                <span className="stat-value">
                                    {formatTimeSpent(invoice.total_time_spent)}
                                </span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Created:</span>
                                <span className="stat-value">
                                    {new Date(invoice.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {invoice.notes && (
                            <div className="invoice-card-notes">
                                <p>{invoice.notes}</p>
                            </div>
                        )}

                        <div className="invoice-card-actions">
                            <button
                                className="btn-view"
                                onClick={() => onSelectInvoice(invoice.id)}
                            >
                                View Details
                            </button>

                            <select
                                className="status-select"
                                value={invoice.status}
                                onChange={(e) =>
                                    handleStatusChange(
                                        invoice.id,
                                        e.target.value as 'draft' | 'sent' | 'paid'
                                    )
                                }
                                disabled={updateStatusMutation.isPending}
                            >
                                <option value="draft">Draft</option>
                                <option value="sent">Sent</option>
                                <option value="paid">Paid</option>
                            </select>

                            <button
                                className="btn-delete"
                                onClick={() => handleDelete(invoice.id)}
                                disabled={deletingId === invoice.id}
                            >
                                {deletingId === invoice.id ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

