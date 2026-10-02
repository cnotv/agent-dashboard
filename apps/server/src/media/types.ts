import type { z } from 'zod'
import type { MediaKind } from '@dashi/contracts'
import type { previewArtifactListSchema } from './schema.ts'

export type PreviewArtifactList = z.infer<typeof previewArtifactListSchema>

// Artifact id of the newest pr-preview recording for each commit.
export type PreviewArtifactsBySha = Map<string, number>

export type PreviewFiles = Record<MediaKind, Uint8Array | null>

export interface StoredMedia {
  bytes: Uint8Array<ArrayBuffer>
  contentType: string
}
