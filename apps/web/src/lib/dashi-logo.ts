import type { LogoParticle } from './types'

// Particles along each side of the rhombus; six keeps each one distinct at the size of the
// sidebar mark while still reading as a field of dots.
const particlesPerSide = 6
const topConcentration = 1
const bottomConcentration = 0.1
// Lattice neighbours sit √2 apart, so a full-concentration particle of this radius nearly
// touches its neighbours without merging into them.
const fullRadius = 0.62
const coordinateDecimals = 3

// Radix indigo 9, the app's accent, fixed here because a tab icon cannot read the page's theme.
export const faviconColor = '#3e63dd'

const rounded = (value: number): number => Number(value.toFixed(coordinateDecimals))

/**
 * Places the logo's particles: a square lattice turned 45°, so the particles form a regular
 * rhombus with one corner at the top. Concentration falls evenly from 1 at the top corner to
 * 0.10 at the bottom one, and each particle's area follows it, so its radius goes with the root.
 * @returns The particles, centred on x = 0 with the top corner at y = 0.
 */
export const logoParticles = (): LogoParticle[] => {
  const lastIndex = particlesPerSide - 1
  const latticeIndices = Array.from({ length: particlesPerSide }, (_, index) => index)
  return latticeIndices.flatMap((rightStep) =>
    latticeIndices.map((leftStep) => {
      const depth = (rightStep + leftStep) / (2 * lastIndex)
      const concentration = topConcentration - (topConcentration - bottomConcentration) * depth
      return {
        x: rounded(rightStep - leftStep),
        y: rounded(rightStep + leftStep),
        radius: rounded(fullRadius * Math.sqrt(concentration)),
        concentration: rounded(concentration),
      }
    }),
  )
}

/**
 * The viewBox that fits the particles with their full radius as margin.
 * @returns The viewBox attribute value.
 */
export const logoViewBox = (): string => {
  const halfWidth = particlesPerSide - 1 + fullRadius
  const height = 2 * (particlesPerSide - 1) + 2 * fullRadius
  return `${rounded(-halfWidth)} ${rounded(-fullRadius)} ${rounded(2 * halfWidth)} ${rounded(height)}`
}

/**
 * The logo as a standalone SVG document, for the browser tab icon.
 * @param color The particles' fill.
 * @returns The SVG markup.
 */
export const logoSvgDocument = (color: string): string =>
  [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logoViewBox()}">`,
    `<g fill="${color}">`,
    ...logoParticles().map((particle) => `<circle cx="${particle.x}" cy="${particle.y}" r="${particle.radius}"/>`),
    '</g>',
    '</svg>',
    '',
  ].join('\n')
