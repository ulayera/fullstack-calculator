export type StoredResult = { display: string; exact: string }

const CONTINUES_NUMBER = /^[0-9.]$/

export const continuesStored = (value: string, stored: StoredResult | null): boolean =>
  stored !== null &&
  value.startsWith(stored.display) &&
  !CONTINUES_NUMBER.test(value.charAt(stored.display.length))

export const expressionToSend = (value: string, stored: StoredResult | null): string =>
  stored !== null && continuesStored(value, stored)
    ? stored.exact + value.slice(stored.display.length)
    : value
