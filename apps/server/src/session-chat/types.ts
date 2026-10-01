import type { z } from 'zod'
import type { AgentSessionState, ChatDelivery, SessionChat } from '@agent-dashboard/contracts'
import type { deliveryReportSchema, runnerChatReportSchema } from './schema.ts'

export type RunnerChatReport = z.infer<typeof runnerChatReportSchema>

export type DeliveryReport = z.infer<typeof deliveryReportSchema>

export interface ChatWorkSession {
  sessionId: string
  sessionState: AgentSessionState | null
}

export interface ChatWorkDelivery extends ChatWorkSession {
  deliveryId: string
  text: string
}

export interface ChatWork {
  sessions: ChatWorkSession[]
  deliveries: ChatWorkDelivery[]
}

export interface TrackedDelivery {
  sessionId: string
  delivery: ChatDelivery
  changedAt: number
}

export interface ChatRelayState {
  watchedUntil: Map<string, number>
  transcripts: Map<string, RunnerChatReport>
  deliveries: Map<string, TrackedDelivery>
}

export interface ChatRelay {
  readChat: (sessionId: string, isRunnerOnline: boolean) => SessionChat
  queueMessage: (sessionId: string, text: string) => ChatDelivery | null
  takeWork: (sessionStateOf: (sessionId: string) => AgentSessionState | null) => ChatWork
  recordTranscript: (sessionId: string, report: RunnerChatReport) => boolean
  recordDeliveryReport: (deliveryId: string, report: DeliveryReport) => boolean
}
