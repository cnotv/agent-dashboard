import type { PickedAttachment } from './types'

const fallbackMediaType = 'application/octet-stream'
const maximumNameLength = 90

// The dashboard and the runner only take a plain base name, so a file's own name is reduced to
// one before it is sent, and kept apart from the names already picked.
const plainNameOf = (fileName: string): string => {
  const plainName = fileName
    .replace(/[^A-Za-z0-9._ -]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^[^A-Za-z0-9]+/, '')
    .slice(0, maximumNameLength)
  return plainName === '' ? 'attachment' : plainName
}

const withSuffix = (plainName: string, suffix: number): string => {
  const extensionStart = plainName.lastIndexOf('.')
  return extensionStart > 0
    ? `${plainName.slice(0, extensionStart)}-${suffix}${plainName.slice(extensionStart)}`
    : `${plainName}-${suffix}`
}

/**
 * Names an attachment after its file, in the form the dashboard accepts and unlike any name taken.
 * @param fileName The file's own name.
 * @param takenNames The names of the attachments already picked.
 * @returns A plain base name, such as screenshot-2.png.
 */
export const attachmentNameFor = (fileName: string, takenNames: string[]): string => {
  const plainName = plainNameOf(fileName)
  const freeSuffix = Array.from({ length: takenNames.length + 1 }, (_, index) => index + 2).find(
    (suffix) => !takenNames.includes(withSuffix(plainName, suffix)),
  )
  return takenNames.includes(plainName) ? withSuffix(plainName, freeSuffix ?? takenNames.length + 2) : plainName
}

/**
 * Picks the media type the dashboard accepts, falling back to plain bytes.
 * @param fileType The type the browser reports, possibly empty.
 * @returns The media type.
 */
export const mediaTypeFor = (fileType: string): string => (/^[a-z]+\/[A-Za-z0-9.+-]{1,100}$/.test(fileType) ? fileType : fallbackMediaType)

const base64Of = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? (reader.result.split(',')[1] ?? '') : '')
    reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })

/**
 * Reads a picked or pasted file into an attachment. It stays in the page until the start sends it.
 * @param file The file.
 * @param takenNames The names of the attachments already picked.
 * @returns The attachment and its size.
 */
export const readAttachment = async (file: File, takenNames: string[]): Promise<PickedAttachment> => ({
  attachment: { name: attachmentNameFor(file.name, takenNames), mediaType: mediaTypeFor(file.type), base64: await base64Of(file) },
  byteSize: file.size,
})
