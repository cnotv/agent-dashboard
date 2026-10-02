import type { CreatedMachineToken, MachineTokenSummary } from '@dashi/contracts'

export interface MachineTokenStore {
  createToken: (label: string) => CreatedMachineToken
  listTokens: () => MachineTokenSummary[]
  revokeToken: (tokenId: string) => void
  verifyToken: (presentedToken: string | undefined) => MachineTokenSummary | null
}
