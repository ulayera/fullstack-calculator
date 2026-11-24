import { useCallback, useEffect, useState } from 'react'
import type { FetchHealth } from '../api/health'

export const HEALTH_INTERVAL_MS = 3000

export function useHealth(fetchHealth: FetchHealth, intervalMs = HEALTH_INTERVAL_MS) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const check = () =>
      fetchHealth()
        .then(
          () => true,
          () => false,
        )
        .then((ok) => {
          if (!active) return
          setAvailable(ok)
          timer = setTimeout(check, intervalMs)
        })
    check()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fetchHealth, intervalMs])

  const markUnavailable = useCallback(() => setAvailable(false), [])

  return { available, markUnavailable }
}
