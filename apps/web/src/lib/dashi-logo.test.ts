import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { faviconColor, logoParticles, logoSvgDocument } from './dashi-logo'

describe('logoParticles', () => {
  const particles = logoParticles()
  const topY = Math.min(...particles.map((particle) => particle.y))
  const bottomY = Math.max(...particles.map((particle) => particle.y))

  it('lays a regular rhombus: one particle at each corner, centred, with the widest row in the middle', () => {
    expect(particles).toHaveLength(36)
    expect(particles.filter((particle) => particle.y === topY)).toEqual([expect.objectContaining({ x: 0 })])
    expect(particles.filter((particle) => particle.y === bottomY)).toEqual([expect.objectContaining({ x: 0 })])
    const xs = particles.map((particle) => particle.x)
    expect(Math.max(...xs)).toBe(-Math.min(...xs))
    expect(Math.max(...xs) * 2).toBe(bottomY - topY)
  })

  it('falls from a concentration of 1 at the top corner to 0.10 at the bottom, with area following it', () => {
    const concentrationAt = (y: number) => particles.find((particle) => particle.y === y)?.concentration
    expect(concentrationAt(topY)).toBe(1)
    expect(concentrationAt(bottomY)).toBe(0.1)
    const topRadius = particles.find((particle) => particle.y === topY)?.radius ?? 0
    particles.forEach((particle) => expect((particle.radius / topRadius) ** 2).toBeCloseTo(particle.concentration, 2))
  })
})

describe('the favicon', () => {
  it('is the logo, written by scripts/write-favicon.ts; rerun it after changing the logo', () => {
    const favicon = readFileSync(new URL('../../public/favicon.svg', import.meta.url), 'utf8')
    expect(favicon).toBe(logoSvgDocument(faviconColor))
  })
})
