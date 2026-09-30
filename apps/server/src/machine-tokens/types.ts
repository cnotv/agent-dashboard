import type { CreatedMachineToken, MachineTokenSummary } from '@agent-dashboard/contracts'

export interface MachineTokenStore {
  createToken: (label: string) => CreatedMachineToken
  listTokens: () => MachineTokenSummary[]
  revokeToken: (tokenId: string) => void
  verifyToken: (presentedToken: string | undefined) => MachineTokenSummary | null
}
