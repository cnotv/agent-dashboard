import { describe, expect, it } from 'vitest'
import { enableNetlifyForRepository, findSiteForRepository, githubInstallationIdOf, siteNameFor } from './sites.ts'
import type { NetlifyRequest, NetlifySite } from './types.ts'

const linkedSite = (repoPath: string, installationId: number | null = 55): NetlifySite => ({
  name: repoPath.replace('/', '-'),
  ssl_url: `https://${repoPath.replace('/', '-')}.netlify.app`,
  url: `http://${repoPath.replace('/', '-')}.netlify.app`,
  admin_url: `https://app.netlify.com/projects/${repoPath.replace('/', '-')}`,
  build_settings: { provider: 'github', repo_path: repoPath, installation_id: installationId },
})

const repository = { owner: 'cnotv', name: 'new-repo' }

const fakeNetlify = (sites: NetlifySite[], createResponse: Response) => {
  const receivedRequests: (NetlifyRequest & { path: string })[] = []
  const fetchNetlify = async (path: string, request: NetlifyRequest = { method: 'GET' }) => {
    receivedRequests.push({ path, ...request })
    return request.method === 'POST' ? createResponse : Response.json(sites)
  }
  return { fetchNetlify, receivedRequests }
}

const fetchGithub = async () => Response.json({ id: 42, full_name: 'cnotv/new-repo', private: true, default_branch: 'main' })

describe('findSiteForRepository', () => {
  it('matches the repository path whatever its case', () => {
    expect(findSiteForRepository([linkedSite('cnotv/Other'), linkedSite('CNOTV/new-repo')], repository)?.name).toBe('CNOTV-new-repo')
    expect(findSiteForRepository([linkedSite('cnotv/other')], repository)).toBeUndefined()
  })
})

describe('githubInstallationIdOf', () => {
  it("reads the Netlify app installation from another of the owner's sites", () => {
    expect(githubInstallationIdOf([linkedSite('someone/else', 1), linkedSite('cnotv/generative-art', 55)], 'cnotv')).toBe(55)
  })

  it('returns null when no site of that owner is linked through the app', () => {
    expect(githubInstallationIdOf([linkedSite('cnotv/manual', null), linkedSite('someone/else', 1)], 'cnotv')).toBeNull()
  })
})

describe('siteNameFor', () => {
  it('turns owner and name into a subdomain', () => {
    expect(siteNameFor({ owner: 'cnotv', name: 'Agent_Dashboard.v2' })).toBe('cnotv-agent-dashboard-v2')
  })
})

describe('enableNetlifyForRepository', () => {
  it('creates a site on the default branch through the owner’s existing installation', async () => {
    const createdSite = linkedSite('cnotv/new-repo')
    const { fetchNetlify, receivedRequests } = fakeNetlify([linkedSite('cnotv/generative-art')], Response.json(createdSite))
    const result = await enableNetlifyForRepository(fetchNetlify, fetchGithub, repository)
    expect(result).toEqual({
      ok: true,
      status: { state: 'active', siteName: 'cnotv-new-repo', siteUrl: createdSite.ssl_url, adminUrl: createdSite.admin_url },
    })
    expect(receivedRequests).toContainEqual({
      path: '/api/v1/sites',
      method: 'POST',
      body: {
        name: 'cnotv-new-repo',
        repo: { provider: 'github', id: 42, repo_path: 'cnotv/new-repo', repo_branch: 'main', public_repo: false, installation_id: 55 },
      },
    })
  })

  it('returns the existing site without creating another', async () => {
    const { fetchNetlify, receivedRequests } = fakeNetlify([linkedSite('cnotv/new-repo')], Response.json({}))
    expect((await enableNetlifyForRepository(fetchNetlify, fetchGithub, repository)).ok).toBe(true)
    expect(receivedRequests.map((request) => request.method)).toEqual(['GET'])
  })

  it('explains what to do when no installation can be found', async () => {
    const { fetchNetlify } = fakeNetlify([], Response.json({}))
    expect(await enableNetlifyForRepository(fetchNetlify, fetchGithub, repository)).toEqual({
      ok: false,
      status: 409,
      message: expect.stringContaining('Link one in Netlify once'),
    })
  })

  it("passes on Netlify's reason when it refuses", async () => {
    const { fetchNetlify } = fakeNetlify(
      [linkedSite('cnotv/generative-art')],
      Response.json({ message: 'subdomain must be unique' }, { status: 422 }),
    )
    expect(await enableNetlifyForRepository(fetchNetlify, fetchGithub, repository)).toEqual({
      ok: false,
      status: 422,
      message: 'subdomain must be unique',
    })
  })
})
