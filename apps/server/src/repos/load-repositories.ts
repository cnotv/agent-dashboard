import { readFileSync } from 'node:fs'
import { z } from 'zod'
import type { RepositoryReference } from '@agent-dashboard/contracts'

const repositoryListSchema = z.array(
  z.object({
    owner: z.string().regex(/^[A-Za-z0-9-]+$/),
    name: z.string().regex(/^[A-Za-z0-9._-]+$/),
  }),
)

/**
 * Parses and validates the list of repositories the dashboard shows.
 * @param rawJson The contents of config/repos.json.
 * @returns The repositories; throws when an owner or name has characters GitHub never allows.
 */
export const parseRepositoryList = (rawJson: string): RepositoryReference[] => repositoryListSchema.parse(JSON.parse(rawJson))

/**
 * Reads and validates the repository list from disk.
 * @param filePath The path to config/repos.json.
 * @returns The repositories.
 */
export const loadRepositories = (filePath: string): RepositoryReference[] => parseRepositoryList(readFileSync(filePath, 'utf8'))

/**
 * Finds a configured repository, so a route never reaches one that is not on the list.
 * @param repositories The configured repositories.
 * @param owner The owner from the request path.
 * @param name The name from the request path.
 * @returns The repository, or undefined when it is not configured.
 */
export const findRepository = (
  repositories: RepositoryReference[],
  owner: string,
  name: string,
): RepositoryReference | undefined => repositories.find((repository) => repository.owner === owner && repository.name === name)
