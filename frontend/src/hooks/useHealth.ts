import { useCallback, useEffect, useState } from 'react'
import type { FetchHealth } from '../api/health'

export const HEALTH_INTERVAL_MS = 3000

export type HealthState = 'unknown' | 'up' | 'down'

export function useHealth(fetchHealth: FetchHealth, intervalMs = HEALTH_INTERVAL_MS) {
  const [health, setHealth] = useState<HealthState>('unknown')

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const check = () =>
      fetchHealth()
        .then(
          (): HealthState => 'up',
          (): HealthState => 'down',
        )
        .then((state) => {
          if (!active) return
          setHealth(state)
          timer = setTimeout(check, intervalMs)
        })
    check()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fetchHealth, intervalMs])

  const markUnavailable = useCallback(() => setHealth('down'), [])

  return { health, markUnavailable }
}
