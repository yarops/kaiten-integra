import { useInvoiceWithCards, useUpdateInvoiceStatus } from '../api/invoices'
import { getTagName } from '../lib/card-rules'
import { getStatusChangeConfirmMessage, groupCardsByPrimaryTag } from '../lib/invoice-rules'
import { calculateCost, formatCurrency, formatHourlyRate } from '../lib/rates'
import { useDialogs } from './dialogs/dialogs-context'
import './InvoiceDetails.css'

interface InvoiceDetailsProps {
    invoiceId: string
    onBack: () => void
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

export const InvoiceDetails = ({ invoiceId, onBack }: InvoiceDetailsProps) => {
    const dialogs = useDialogs()
    const { data: invoice, isLoading } = useInvoiceWithCards(invoiceId)
    const updateStatusMutation = useUpdateInvoiceStatus()

    const handleStatusChange = async (newStatus: 'draft' | 'sent' | 'paid') => {
        if (!invoice) return

        if (!await dialogs.confirm({ title: 'Change invoice status', message: getStatusChangeConfirmMessage(invoice.status, newStatus) })) return

        try {
            await updateStatusMutation.mutateAsync({
                invoiceId: invoice.id,
                status: newStatus,
            })
        } catch (error) {
            dialogs.error('Failed to update invoice status.', error)
        }
    }

    /**
     * Handles printing the invoice as PDF.
     */
    const handlePrint = () => {
        window.print()
    }

    if (isLoading) {
        return <p className="info-message">Loading invoice details...</p>
    }

    if (!invoice) {
        return <p className="info-message">Invoice not found</p>
    }

    // Calculate total amount for the invoice.
    const totalAmount = invoice.invoice_cards.reduce((sum, card) => {
        return sum + calculateCost(card.time_spent, invoice.hourly_rate)
    }, 0)

    return (
        <div className="invoice-details-container">
            <div className="invoice-details-header">
                <div className="invoice-header-left">
                    <button className="btn-back" onClick={onBack}>
                        ← Back to Invoices
                    </button>
                    <button className="btn-print" onClick={handlePrint}>
                        🖨️ Print PDF
                    </button>
                </div>
                <div className="invoice-status-controls">
                    <div className={`status-badge ${getStatusClass(invoice.status)}`}>
                        {getStatusLabel(invoice.status)}
                    </div>
                    <div className="status-actions">
                        <button
                            className={`btn-status ${invoice.status === 'draft' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('draft')}
                            disabled={invoice.status === 'draft' || updateStatusMutation.isPending}
                        >
                            Draft
                        </button>
                        <button
                            className={`btn-status ${invoice.status === 'sent' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('sent')}
                            disabled={invoice.status === 'sent' || updateStatusMutation.isPending}
                        >
                            Sent
                        </button>
                        <button
                            className={`btn-status btn-status-paid ${invoice.status === 'paid' ? 'active' : ''}`}
                            onClick={() => handleStatusChange('paid')}
                            disabled={invoice.status === 'paid' || updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending && invoice.status !== 'paid' ? 'Processing...' : 'Paid'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="invoice-info">
                <div className="invoice-info-section">
                    <h2>{invoice.board_title || 'Untitled Board'}</h2>
                    <p className="invoice-space">{invoice.workspace_title || 'Untitled Workspace'}</p>
                </div>

                <div className="invoice-stats-grid">
                    <div className="stat-box">
                        <span className="stat-label">Total Cards</span>
                        <span className="stat-value">{invoice.total_cards}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Total Time</span>
                        <span className="stat-value">
                            {formatTimeSpent(invoice.total_time_spent)}
                        </span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Hourly Rate</span>
                        <span className="stat-value">{formatHourlyRate(invoice.hourly_rate)}</span>
                    </div>
                    <div className="stat-box stat-box-total">
                        <span className="stat-label">Total Amount</span>
                        <span className="stat-value">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Created</span>
                        <span className="stat-value">
                            {new Date(invoice.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Updated</span>
                        <span className="stat-value">
                            {new Date(invoice.updated_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {invoice.status === 'draft' && (
                    <p className="invoice-draft-note">
                        Draft: card details and time are refreshed from the cards when the invoice leaves draft.
                    </p>
                )}

                {invoice.notes && (
                    <div className="invoice-notes-section">
                        <h3>Notes</h3>
                        <p>{invoice.notes}</p>
                    </div>
                )}
            </div>

            <div className="invoice-cards-section">
                <h3>Cards ({invoice.invoice_cards.length})</h3>
                {Array.from(groupCardsByPrimaryTag(invoice.invoice_cards)).map(([tagName, cards]) => (
                    <div key={tagName} className="tag-group">
                        <div className="tag-group-header">
                            <h4 className="tag-group-title">{tagName}</h4>
                            <span className="tag-group-count">({cards.length})</span>
                        </div>
                        <div className="table-container">
                            <table className="invoice-cards-table">
                                <thead>
                                    <tr>
                                        <th>Card ID</th>
                                        <th>Title</th>
                                        <th>Tags</th>
                                        <th>Time Spent</th>
                                        <th>Rate</th>
                                        <th>Amount</th>
                                        <th>Created</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cards.map((card) => (
                                        <tr key={card.id}>
                                            <td className="card-id">{card.card_id}</td>
                                            <td className="card-title-cell">
                                                <div className="card-title">{card.card_title}</div>
                                                {card.card_description && (
                                                    <div className="card-description">
                                                        {card.card_description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="card-tags">
                                                {card.tags && card.tags.length > 0 ? (
                                                    <div className="tags-list">
                                                        {card.tags.map((tag, index) => (
                                                            <span key={index} className="tag">
                                                                {getTagName(tag)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className="card-time">{formatTimeSpent(card.time_spent)}</td>
                                            <td className="card-rate">{formatHourlyRate(invoice.hourly_rate)}</td>
                                            <td className="card-amount">{formatCurrency(calculateCost(card.time_spent, invoice.hourly_rate))}</td>
                                            <td className="card-date">
                                                {card.created_at
                                                    ? new Date(card.created_at).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
