import { describe, expect, it } from 'vitest'
import { continuesStored, expressionToSend } from './chain'

const stored = { display: '0.3333333333333333', exact: '0.3333333333333333333333333333333333' }

describe('continuesStored', () => {
  it('is false without a stored result', () => {
    expect(continuesStored('1+2', null)).toBe(false)
  })

  it.each(['0.3333333333333333', '0.3333333333333333*3', '0.3333333333333333-(1)', '0.3333333333333333)'])(
    'is true for %j',
    (value) => {
      expect(continuesStored(value, stored)).toBe(true)
    },
  )

  it.each(['0.33333333333333331', '0.3333333333333333.', '0.333333333333333*3', '1+0.3333333333333333', ''])(
    'is false for %j',
    (value) => {
      expect(continuesStored(value, stored)).toBe(false)
    },
  )
})

describe('expressionToSend', () => {
  it('swaps the untouched display for the exact value', () => {
    expect(expressionToSend('0.3333333333333333*3', stored)).toBe(
      '0.3333333333333333333333333333333333*3',
    )
  })

  it('sends the exact value alone when nothing was appended', () => {
    expect(expressionToSend('0.3333333333333333', stored)).toBe(stored.exact)
  })

  it('sends what is on screen once the digits were edited', () => {
    expect(expressionToSend('0.33333333333333334*3', stored)).toBe('0.33333333333333334*3')
  })

  it('sends what is on screen without a stored result', () => {
    expect(expressionToSend('1/3', null)).toBe('1/3')
  })

  it('handles a negative stored result', () => {
    expect(expressionToSend('-0.6666666666666667+1', { display: '-0.6666666666666667', exact: '-0.6666666666666666666666666666666667' })).toBe(
      '-0.6666666666666666666666666666666667+1',
    )
  })
})
