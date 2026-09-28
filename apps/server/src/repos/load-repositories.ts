import { readFileSync } from 'node:fs'
import { z } from 'zod'
import type { RepositoryReference } from '@agent-dashboard/contracts'

const repositoryListSchema = z.array(
  z.object({
    owner: z.string().regex(/^[A-Za-z0-9-]+$/),
    name: z.string().regex(/^[A-Za-z0-9._-]+$/),
  }),
)

export const parseRepositoryList = (rawJson: string): RepositoryReference[] => repositoryListSchema.parse(JSON.parse(rawJson))

export const loadRepositories = (filePath: string): RepositoryReference[] => parseRepositoryList(readFileSync(filePath, 'utf8'))

export const findRepository = (
  repositories: RepositoryReference[],
  owner: string,
  name: string,
): RepositoryReference | undefined => repositories.find((repository) => repository.owner === owner && repository.name === name)
