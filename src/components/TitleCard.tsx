'use client'

import { Fragment, useEffect, useState } from 'react'

const TITLE = "Who's Got a Match?"
const MOBILE_BREAK_INDEX = 10 // break before "a Match?" on small screens
const LETTER_STAGGER = 0.08 // seconds between each letter
const LETTER_DURATION = 0.55 // must match the CSS animation duration
const HOLD_AFTER = 1000 // 1s pause after letters finish
const FADE_DURATION = 1800 // fade-out length in ms

export default function TitleCard() {
  const [fading, setFading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const lettersDoneMs =
      ((TITLE.length - 1) * LETTER_STAGGER + LETTER_DURATION) * 1000

    const fadeTimer = setTimeout(() => setFading(true), lettersDoneMs + HOLD_AFTER)
    const removeTimer = setTimeout(
      () => setDone(true),
      lettersDoneMs + HOLD_AFTER + FADE_DURATION
    )

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
    }
  }, [])

  // Lock page scroll while the title card is on screen.
  useEffect(() => {
    if (done) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [done])

  if (done) return null

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black px-6 transition-opacity ease-in-out"
      style={{
        opacity: fading ? 0 : 1,
        transitionDuration: `${FADE_DURATION}ms`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <h1 className="font-manufacturing select-none text-center text-5xl leading-none text-white sm:text-7xl md:text-8xl">
        {TITLE.split('').map((char, i) => (
          <Fragment key={i}>
            {i === MOBILE_BREAK_INDEX && <br className="sm:hidden" />}
            <span
              className="letter"
              style={{ animationDelay: `${i * LETTER_STAGGER}s` }}
            >
              {char}
            </span>
          </Fragment>
        ))}
      </h1>
    </div>
  )
}
