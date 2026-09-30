import type { IssueLabel, StartOptions, StartTarget, StartWorkflow } from '@agent-dashboard/contracts'
import type { StartTargetAvailability } from './types'

const workflowByLabel: Record<string, StartWorkflow> = {
  bug: 'fix',
  documentation: 'docs',
  docs: 'docs',
  enhancement: 'feature',
  feature: 'feature',
  security: 'security',
  test: 'tests',
  tests: 'tests',
  refactor: 'refactor',
  design: 'design',
  chore: 'chore',
  dependencies: 'chore',
}

/**
 * Suggests a workflow from an issue's labels, falling back to feature.
 * @param labels The issue's labels.
 * @returns The workflow the first recognised label points at.
 */
export const suggestedWorkflowFor = (labels: IssueLabel[]): StartWorkflow =>
  labels.map((label) => workflowByLabel[label.name.toLowerCase()]).find((workflow) => workflow !== undefined) ?? 'feature'

/**
 * Says whether a place to run can take a start now, and what the person should know about it.
 * @param target Where the session would run.
 * @param options The runners seen and whether the repository has a routine.
 * @returns Whether it can be picked, and a hint when something is missing or late.
 */
export const targetAvailabilityFor = (target: StartTarget, options: StartOptions): StartTargetAvailability => {
  if (target === 'cloud-routine') {
    return options.routineConfigured
      ? { isAvailable: true, hint: null }
      : { isAvailable: false, hint: 'Set up a routine for this repository under Credentials' }
  }
  if (options.runners.length === 0) return { isAvailable: false, hint: 'Set up the laptop runner under Credentials' }
  return options.runners.some((runner) => runner.isOnline)
    ? { isAvailable: true, hint: null }
    : { isAvailable: true, hint: 'No runner is online; the start waits until the laptop runner next asks' }
}

/**
 * Picks where a start runs by default: the laptop when its runner is online, the routine when
 * there is one, the laptop otherwise.
 * @param options The runners seen and whether the repository has a routine.
 * @returns The default place to run.
 */
export const defaultTargetFor = (options: StartOptions): StartTarget => {
  if (options.runners.some((runner) => runner.isOnline)) return 'laptop-remote-control'
  return options.routineConfigured ? 'cloud-routine' : 'laptop-remote-control'
}
