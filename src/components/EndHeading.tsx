import { Fragment } from 'react'

const TEXT = 'are you ready for the end?'
const ACCENT_WORDS = new Set(['ready', 'end?'])
const STAGGER = 0.05 // seconds between each letter
const LETTER_DURATION = 0.5 // must match the CSS animation duration

// How long the full letter-by-letter reveal takes, in ms.
const LETTER_COUNT = TEXT.replace(/\s/g, '').length
export const TEXT_REVEAL_MS = Math.round(
  ((LETTER_COUNT - 1) * STAGGER + LETTER_DURATION) * 1000
)

export default function EndHeading({ active }: { active: boolean }) {
  const words = TEXT.split(' ')
  let letterIndex = 0

  return (
    <h2
      className={`reveal font-manufacturing mt-6 text-center text-3xl text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] sm:text-5xl ${
        active ? 'in-view' : ''
      }`}
    >
      {words.map((word, wi) => {
        const accent = ACCENT_WORDS.has(word)
        return (
          <Fragment key={wi}>
            {wi > 0 && ' '}
            <span className={`inline-block ${accent ? 'text-[hsl(var(--accent))]' : ''}`}>
              {word.split('').map((char, ci) => {
                const delay = letterIndex * STAGGER
                letterIndex++
                return (
                  <span
                    key={ci}
                    className="reveal-letter"
                    style={{ animationDelay: `${delay}s` }}
                  >
                    {char}
                  </span>
                )
              })}
            </span>
          </Fragment>
        )
      })}
    </h2>
  )
}
