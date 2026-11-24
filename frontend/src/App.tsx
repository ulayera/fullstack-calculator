import { useEffect, useState } from 'react'
import { fetchHealth as defaultFetchHealth, type FetchHealth } from './api/health'
import './App.css'

const LOADING = 'checking...'
const UNAVAILABLE = 'unavailable'

type AppProps = { fetchHealth?: FetchHealth }

export default function App({ fetchHealth = defaultFetchHealth }: AppProps) {
  const [status, setStatus] = useState(LOADING)

  useEffect(() => {
    let active = true
    fetchHealth()
      .then((health) => active && setStatus(health.status))
      .catch(() => active && setStatus(UNAVAILABLE))
    return () => {
      active = false
    }
  }, [fetchHealth])

  return (
    <main className="app">
      <h1 className="app__title">hello world!</h1>
      <p className="app__status" role="status" data-status={status}>
        status: {status}
      </p>
    </main>
  )
}
