import { Callout, Flex, RadioCards, Select, Text } from '@radix-ui/themes'
import type { StartOptions, StartTarget } from '@dashi/contracts'
import { permissionModeLabels, permissionModeOrder, startTargetLabels, startTargetOrder, startWorkflowOrder } from '@/lib/presentation'
import { targetAvailabilityFor } from '@/lib/start-session'
import type { StartChoices, StartTargetAvailability } from '@/lib/types'

interface StartChoicesFieldsProps {
  choices: StartChoices
  onChange: (choices: StartChoices) => void
  options: StartOptions | null
  optionsError: string | null
  chosenTarget: StartTarget | null
  chosenAvailability: StartTargetAvailability | null
  attachmentBytes: number
  showsWorkflow: boolean
}

/**
 * The choices every start dialog asks for: the workflow, where the session runs, and for an
 * unattended laptop session its permission mode.
 */
export const StartChoicesFields = ({
  choices,
  onChange,
  options,
  optionsError,
  chosenTarget,
  chosenAvailability,
  attachmentBytes,
  showsWorkflow,
}: StartChoicesFieldsProps) => (
  <>
    {showsWorkflow && (
      <label>
        <Text as="div" size="2" mb="1" weight="medium">
          Workflow
        </Text>
        <Select.Root
          value={choices.workflow}
          onValueChange={(value) => onChange({ ...choices, workflow: startWorkflowOrder.find((workflow) => workflow === value) ?? choices.workflow })}
        >
          <Select.Trigger />
          <Select.Content>
            {startWorkflowOrder.map((workflow) => (
              <Select.Item key={workflow} value={workflow}>
                {workflow}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </label>
    )}
    <Flex direction="column" gap="1">
      <Text size="2" weight="medium">
        Where it runs
      </Text>
      {optionsError && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{optionsError}</Callout.Text>
        </Callout.Root>
      )}
      <RadioCards.Root
        value={chosenTarget ?? undefined}
        onValueChange={(value) => onChange({ ...choices, target: startTargetOrder.find((target) => target === value) ?? null })}
        columns={{ initial: '1', sm: '2' }}
      >
        {startTargetOrder.map((target) => {
          const availability = options ? targetAvailabilityFor(target, options, attachmentBytes) : { isAvailable: false, hint: null }
          return (
            <RadioCards.Item key={target} value={target} disabled={!availability.isAvailable}>
              <Flex direction="column" gap="1" width="100%">
                <Text size="2" weight="medium">
                  {startTargetLabels[target].name}
                </Text>
                <Text size="1" color="gray">
                  {availability.isAvailable ? startTargetLabels[target].description : availability.hint}
                </Text>
              </Flex>
            </RadioCards.Item>
          )
        })}
      </RadioCards.Root>
      {chosenAvailability?.hint && (
        <Text size="1" color={chosenAvailability.isAvailable ? 'amber' : 'red'}>
          {chosenAvailability.hint}
        </Text>
      )}
    </Flex>
    {chosenTarget === 'laptop-headless' && (
      <label>
        <Text as="div" size="2" mb="1" weight="medium">
          Permissions
        </Text>
        <Select.Root
          value={choices.permissionMode}
          onValueChange={(value) =>
            onChange({ ...choices, permissionMode: permissionModeOrder.find((permissionMode) => permissionMode === value) ?? 'auto' })
          }
        >
          <Select.Trigger />
          <Select.Content>
            {permissionModeOrder.map((permissionMode) => (
              <Select.Item key={permissionMode} value={permissionMode}>
                {permissionModeLabels[permissionMode]}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </label>
    )}
  </>
)
