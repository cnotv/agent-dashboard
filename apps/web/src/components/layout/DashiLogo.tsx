import { logoParticles, logoViewBox } from '@/lib/dashi-logo'

const particles = logoParticles()
const viewBox = logoViewBox()

/** Dashi's mark: a rhombus of particles, dense at the top corner and sparse at the bottom, in the accent colour. */
export const DashiLogo = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox={viewBox} fill="var(--accent-9)" aria-hidden="true">
    {particles.map((particle) => (
      <circle key={`${particle.x},${particle.y}`} cx={particle.x} cy={particle.y} r={particle.radius} />
    ))}
  </svg>
)
