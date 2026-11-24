import { calculatorApi, type CalculatorApi } from './api/calculator'
import { fetchHealth as defaultFetchHealth, type FetchHealth } from './api/health'
import { Calculator } from './components/Calculator'
import { useHealth } from './hooks/useHealth'
import './App.css'

type AppProps = { api?: CalculatorApi; fetchHealth?: FetchHealth }

export default function App({ api = calculatorApi, fetchHealth = defaultFetchHealth }: AppProps) {
  const { health, markUnavailable } = useHealth(fetchHealth)

  return (
    <main className="app">
      <h1 className="app__title">Calculator</h1>
      <Calculator api={api} health={health} onUnavailable={markUnavailable} />
    </main>
  )
}
