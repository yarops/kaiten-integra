import { useState } from 'react'
import { Link, Outlet, useMatch } from '@tanstack/react-router'
import './App.css'
import { useConfigStore } from './store/config-store'
import { CardsHeader } from './pages/Cards'
import { SettingsForm } from './components/SettingsForm'

/**
 * Root layout: header with navigation and the current route below it.
 */
function App() {
    const [showSettings, setShowSettings] = useState(false)
    const cardsSearch = useConfigStore((state) => state.cardsSearch)
    const cardsMatch = useMatch({ from: '/', shouldThrow: false })

    return <div className="app-shell">
        <header className="app-header">
            <h1>Workspaces & Invoices</h1>
            <nav className="app-nav">
                <Link to="/" search={cardsSearch} className="nav-btn" activeProps={{ className: 'active' }} activeOptions={{ exact: true, includeSearch: false }}>Cards & Invoice</Link>
                <Link to="/invoices" className="nav-btn" activeProps={{ className: 'active' }}>Invoices</Link>
                <button className="nav-btn" onClick={() => setShowSettings(true)}>Settings</button>
            </nav>
            {cardsMatch && <CardsHeader />}
        </header>

        <main className="app-content">
            <Outlet />
        </main>
        {showSettings && <SettingsForm onClose={() => setShowSettings(false)} />}
    </div>
}

export default App
