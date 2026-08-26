'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EMPTY_FLAGS,
  FLAG_KEYS,
  LOCATION_IDS,
  type Flags,
  type FlagKey,
  type LocationId,
} from './types'
import { idFromPath, pathFor } from './types'
import { parentOf } from './graph'

const STORAGE_KEY = 'wgam-world-v2'

function isLocation(value: string): value is LocationId {
  return (LOCATION_IDS as string[]).includes(value)
}

function readFlags(): Flags {
  if (typeof window === 'undefined') return { ...EMPTY_FLAGS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_FLAGS }
    const parsed = JSON.parse(raw) as Partial<Flags>
    const next = { ...EMPTY_FLAGS }
    for (const key of FLAG_KEYS) {
      if (typeof parsed[key] === 'boolean') next[key] = parsed[key] as boolean
    }
    return next
  } catch {
    return { ...EMPTY_FLAGS }
  }
}

export function useWorldState(initialLocation: string) {
  const start = isLocation(initialLocation) ? initialLocation : 'map'
  const [location, setLocation] = useState<LocationId>(start)
  const [flags, setFlags] = useState<Flags>(EMPTY_FLAGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const loc = idFromPath(window.location.pathname)
    setFlags(readFlags())
    setLocation(loc)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags))
  }, [flags, ready])

  useEffect(() => {
    const onPop = () => {
      const id = idFromPath(window.location.pathname)
      setLocation(id)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const go = useCallback((id: LocationId) => {
    const next = pathFor(id)
    if (window.location.pathname !== next) {
      window.history.pushState({ loc: id }, '', next)
    }
    setLocation(id)
  }, [])

  const back = useCallback(() => {
    const parent = parentOf(location)
    if (parent) {
      go(parent)
      return
    }
    window.location.href = '/'
  }, [go, location])

  const setFlag = useCallback((key: FlagKey, value = true) => {
    setFlags(prev => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => {
    setFlags({ ...EMPTY_FLAGS })
    go('map')
  }, [go])

  return useMemo(
    () => ({ location, flags, ready, go, back, setFlag, reset }),
    [location, flags, ready, go, back, setFlag, reset],
  )
}
