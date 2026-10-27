'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Check } from 'lucide-react'

type Status = 'idle' | 'submitting' | 'error'
/**
 * form    -> input + JOIN
 * success -> "YOU'RE IN" bar swaps in
 * leaving -> whole block fades and collapses (hero re-centres)
 * gone    -> unmounted
 */
type Phase = 'form' | 'success' | 'leaving' | 'gone'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUCCESS_HOLD_MS = 1800
const LEAVE_MS = 700

export default function EmailCapture() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')

  // Hold the success state for a beat, then animate out and unmount.
  useEffect(() => {
    if (phase === 'success') {
      const t = window.setTimeout(() => setPhase('leaving'), SUCCESS_HOLD_MS)
      return () => window.clearTimeout(t)
    }
    if (phase === 'leaving') {
      const t = window.setTimeout(() => setPhase('gone'), LEAVE_MS)
      return () => window.clearTimeout(t)
    }
  }, [phase])

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (status === 'submitting' || phase !== 'form') return

    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) {
      setStatus('error')
      setError('Enter a valid email address.')
      return
    }

    setStatus('submitting')
    setError(null)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Something went wrong. Try again.')
      }
      setStatus('idle')
      setPhase('success')
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    }
  }

  if (phase === 'gone') return null

  const busy = status === 'submitting'
  const leaving = phase === 'leaving'

  return (
    // Grid-row trick animates height to 0 so the hero above re-centres smoothly.
    <div
      className="grid w-full justify-items-center transition-[grid-template-rows,opacity,transform] ease-[cubic-bezier(0.7,0,0.2,1)]"
      style={{
        gridTemplateRows: leaving ? '0fr' : '1fr',
        opacity: leaving ? 0 : 1,
        transform: leaving ? 'translateY(14px)' : 'none',
        transitionDuration: `${LEAVE_MS}ms`,
      }}
      aria-hidden={leaving || undefined}
    >
      <div className="flex w-full min-h-0 justify-center overflow-hidden">
        <div className="flex w-full max-w-lg flex-col items-stretch gap-3 pt-10">
          {phase === 'form' ? (
            <form onSubmit={submit} noValidate className="flex w-full flex-col items-stretch gap-3">
              <label htmlFor="hero-email" className="sr-only">
                Email address
              </label>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-0 sm:rounded-sm sm:border sm:border-white/20 sm:bg-black sm:p-1 sm:focus-within:border-white/50">
                <input
                  id="hero-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  disabled={busy}
                  onChange={e => {
                    setEmail(e.target.value)
                    if (status === 'error') {
                      setStatus('idle')
                      setError(null)
                    }
                  }}
                  aria-invalid={status === 'error' || undefined}
                  aria-describedby="hero-email-error"
                  className="font-aboreto h-12 w-full min-w-0 rounded-sm border border-white/20 bg-black px-5 text-sm tracking-[0.15em] text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none disabled:opacity-60 sm:flex-1 sm:border-0"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="font-aboreto h-12 shrink-0 rounded-sm bg-[hsl(var(--accent))] px-8 text-sm tracking-[0.25em] text-white transition-colors duration-200 hover:bg-[hsl(var(--accent)/0.85)] disabled:cursor-wait disabled:opacity-70"
                >
                  {busy ? 'JOINING…' : 'JOIN'}
                </button>
              </div>
              {/* one line slot: helper text normally, error when there is one */}
              <p
                id="hero-email-error"
                role={error ? 'alert' : undefined}
                className={`font-aboreto min-h-[1rem] text-center text-[0.65rem] tracking-[0.3em] ${
                  error ? 'text-[hsl(var(--accent))]' : 'text-white/45'
                }`}
              >
                {error ? error.toUpperCase() : 'BE FIRST TO HEAR THE DEBUT SINGLE'}
              </p>
            </form>
          ) : (
            <div
              className="flex w-full flex-col items-stretch gap-3 animate-[letter-rise_0.35s_ease-out_both]"
              role="status"
              aria-live="polite"
            >
              <div className="flex h-14 w-full items-center justify-center gap-3 rounded-sm border border-white/20 bg-black px-5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--accent))]">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden />
                </span>
                <span className="font-aboreto text-sm tracking-[0.25em] text-white">YOU&apos;RE IN</span>
              </div>
              <p className="font-aboreto min-h-[1rem] text-center text-[0.65rem] tracking-[0.3em] text-white/45">
                WE&apos;LL EMAIL YOU WHEN THE SINGLE DROPS
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
