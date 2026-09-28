const redactionMarker = '[redacted]'
// Very short values would redact ordinary words; anything a provider issues is far longer.
const minimumRedactableLength = 8

const escapeForPattern = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const createRedactor = (secretValues: string[]): ((text: string) => string) => {
  const redactableValues = secretValues
    .filter((secretValue) => secretValue.length >= minimumRedactableLength)
    .sort((first, second) => second.length - first.length)
  if (redactableValues.length === 0) return (text) => text
  const secretPattern = new RegExp(redactableValues.map(escapeForPattern).join('|'), 'g')
  return (text) => text.replace(secretPattern, redactionMarker)
}
