import type { z } from 'zod'
import type { RepositoryReference, SessionStart, SessionStartRequest } from '@dashi/contracts'
import type { MachineTokenStore } from '../machine-tokens/types.ts'
import type { Vault } from '../secrets/types.ts'
import type { runnerReportSchema } from './schema.ts'

export type RunnerReport = z.infer<typeof runnerReportSchema>

export interface ClaimedStart {
  start: SessionStart
  prompt: string
}

export interface SessionStartStore {
  createStart: (request: SessionStartRequest) => SessionStart
  listRecentStarts: () => SessionStart[]
  claimNextLaptopStart: (runnerLabel: string) => SessionStart | null
  recordRunnerReport: (startId: string, runnerLabel: string, report: RunnerReport) => SessionStart | null
  recordOutcome: (startId: string, outcome: { state: 'started' | 'failed'; sessionUrl: string | null; message: string | null }) => SessionStart
}

export interface RoutineStore {
  readRoutineId: (repository: RepositoryReference) => string | null
  saveRoutineId: (repository: RepositoryReference, routineId: string) => void
  deleteRoutineId: (repository: RepositoryReference) => void
}

export type RoutineFireResult = { ok: true; sessionUrl: string } | { ok: false; message: string }

export type RoutineFirer = (routineId: string, routineToken: string, text: string) => Promise<RoutineFireResult>

export interface SessionStartServices {
  startStore: SessionStartStore
  routineStore: RoutineStore
  runnerTokens: MachineTokenStore
  fireRoutine: RoutineFirer
  runnerScriptPath: string
}

export interface SessionStartDependencies extends SessionStartServices {
  vault: Vault
  repositories: RepositoryReference[]
  now: () => number
}
