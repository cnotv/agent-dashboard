import type { NetlifyStatus, RepositoryReference } from '@dashi/contracts'
import { githubRepositorySchema, netlifyErrorSchema, netlifySiteSchema, netlifySitesSchema } from './schema.ts'
import type { GithubRepositoryDetails, NetlifyEnableResult, NetlifyFetcher, NetlifySite } from './types.ts'
import type { GithubRestFetcher } from '../github/types.ts'

const repositoryPathOf = (repository: RepositoryReference): string => `${repository.owner}/${repository.name}`.toLowerCase()

/**
 * Finds the Netlify site that builds a repository.
 * @param sites Every site on the Netlify account.
 * @param repository The repository.
 * @returns The site, or undefined when none builds it.
 */
export const findSiteForRepository = (sites: NetlifySite[], repository: RepositoryReference): NetlifySite | undefined =>
  sites.find((site) => site.build_settings?.repo_path?.toLowerCase() === repositoryPathOf(repository))

/**
 * Finds the Netlify GitHub App installation that already links another repository of the same
 * owner. Netlify's API has no call that lists installations, and a site linked without one gets
 * no pushes, so a site the user linked in Netlify's own screens is where the number comes from.
 * @param sites Every site on the Netlify account.
 * @param owner The GitHub user or organisation.
 * @returns The installation number, or null when no site of that owner is linked through the app.
 */
export const githubInstallationIdOf = (sites: NetlifySite[], owner: string): number | null =>
  sites.find(
    (site) =>
      site.build_settings?.provider === 'github' &&
      site.build_settings.repo_path?.toLowerCase().startsWith(`${owner.toLowerCase()}/`) === true &&
      typeof site.build_settings.installation_id === 'number',
  )?.build_settings?.installation_id ?? null

/**
 * Names a new site after its repository, in the form Netlify accepts for a subdomain.
 * @param repository The repository.
 * @returns The site name, such as cnotv-dashi.
 */
export const siteNameFor = (repository: RepositoryReference): string =>
  `${repository.owner}-${repository.name}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Describes a site as the board shows it.
 * @param site The Netlify site.
 * @returns The active status with its addresses.
 */
export const activeStatusOf = (site: NetlifySite): NetlifyStatus => ({
  state: 'active',
  siteName: site.name,
  siteUrl: site.ssl_url ?? site.url,
  adminUrl: site.admin_url,
})

/**
 * Reads every site on the Netlify account.
 * @param fetchNetlify The Netlify caller.
 * @returns The sites; the first hundred, which covers a personal account.
 */
export const fetchNetlifySites = async (fetchNetlify: NetlifyFetcher): Promise<NetlifySite[]> => {
  const sitesResponse = await fetchNetlify('/api/v1/sites?filter=all&per_page=100')
  if (!sitesResponse.ok) throw new Error(`Netlify answered ${sitesResponse.status}`)
  const parsedSites = netlifySitesSchema.safeParse(await sitesResponse.json())
  if (!parsedSites.success) throw new Error('Unexpected Netlify response')
  return parsedSites.data
}

const netlifyFailureOf = async (response: Response): Promise<NetlifyEnableResult> => {
  const parsedError = netlifyErrorSchema.safeParse(await response.json().catch(() => null))
  return { ok: false, status: response.status, message: parsedError.success ? parsedError.data.message : `Netlify answered ${response.status}` }
}

const readGithubRepository = async (
  fetchGithub: GithubRestFetcher,
  repository: RepositoryReference,
): Promise<GithubRepositoryDetails | null> => {
  const repositoryResponse = await fetchGithub(`/repos/${repository.owner}/${repository.name}`)
  if (!repositoryResponse.ok) return null
  const parsedRepository = githubRepositorySchema.safeParse(await repositoryResponse.json())
  return parsedRepository.success ? parsedRepository.data : null
}

/**
 * Creates a Netlify site that builds a repository from its default branch and posts deploy
 * previews on its pull requests. The build command and folder come from the repository's own
 * netlify.toml, so nothing about the build is decided here.
 * @param fetchNetlify The Netlify caller.
 * @param fetchGithub The GitHub REST caller, used for the repository's id, visibility and default branch.
 * @param repository The repository.
 * @returns The new site's status, the existing one when a site already builds it, or Netlify's refusal.
 */
export const enableNetlifyForRepository = async (
  fetchNetlify: NetlifyFetcher,
  fetchGithub: GithubRestFetcher,
  repository: RepositoryReference,
): Promise<NetlifyEnableResult> => {
  const sites = await fetchNetlifySites(fetchNetlify)
  const existingSite = findSiteForRepository(sites, repository)
  if (existingSite) return { ok: true, status: activeStatusOf(existingSite) }
  const installationId = githubInstallationIdOf(sites, repository.owner)
  if (installationId === null) {
    return {
      ok: false,
      status: 409,
      message: `No Netlify site is linked to a ${repository.owner} repository yet. Link one in Netlify once; Enable then works for the rest`,
    }
  }
  const githubRepository = await readGithubRepository(fetchGithub, repository)
  if (githubRepository === null) return { ok: false, status: 404, message: 'GitHub did not return the repository' }
  const createResponse = await fetchNetlify('/api/v1/sites', {
    method: 'POST',
    body: {
      name: siteNameFor(repository),
      repo: {
        provider: 'github',
        id: githubRepository.id,
        repo_path: githubRepository.full_name,
        repo_branch: githubRepository.default_branch,
        public_repo: !githubRepository.private,
        installation_id: installationId,
      },
    },
  })
  if (!createResponse.ok) return netlifyFailureOf(createResponse)
  const createdSite = netlifySiteSchema.safeParse(await createResponse.json())
  return createdSite.success
    ? { ok: true, status: activeStatusOf(createdSite.data) }
    : { ok: false, status: 502, message: 'Unexpected Netlify response' }
}
