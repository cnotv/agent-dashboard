import { CheckCircledIcon } from '@radix-ui/react-icons'
import { Button, Callout, Card, Checkbox, Flex, Heading, Text, TextField } from '@radix-ui/themes'
import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { usePolledResource } from '@/hooks/usePolledResource'
import { useToast } from '@/hooks/useToast'
import { dashboardApi } from '@/lib/api'
import { pairingCodeFrom, platformLabels } from '@/lib/machine-setup'

/**
 * The page dashi connect opens: it shows the machine waiting with a code and, once approved here,
 * hands that machine its tokens through the pairing. Nothing is shown or copied.
 */
export const PairView = () => {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const [typedCode, setTypedCode] = useState(searchParams.get('code') ?? '')
  const [typedLabel, setTypedLabel] = useState<string | null>(null)
  const [withRunner, setWithRunner] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [approvedHostname, setApprovedHostname] = useState<string | null>(null)
  const userCode = pairingCodeFrom(typedCode)
  const pairing = usePolledResource(`pairing-${userCode ?? ''}`, async () => (userCode === null ? null : dashboardApi.describePairing(userCode)), null)
  const description = pairing.isStale ? null : pairing.resource
  const lookupError = pairing.isStale || userCode === null ? null : pairing.errorMessage
  const label = typedLabel ?? description?.hostname ?? ''

  const approve = async (submitEvent: FormEvent): Promise<void> => {
    submitEvent.preventDefault()
    if (userCode === null || description === null) return
    setIsApproving(true)
    try {
      await dashboardApi.approvePairing({ userCode, label: label.trim(), withRunner })
      setApprovedHostname(description.hostname)
    } catch (approveError) {
      toast.notifyError(approveError)
    } finally {
      setIsApproving(false)
    }
  }

  if (approvedHostname !== null) {
    return (
      <Card size="3" className="pair-card">
        <Flex direction="column" gap="3" align="start">
          <Heading as="h2" size="4" weight="medium">
            <Flex align="center" gap="2">
              <CheckCircledIcon />
              {approvedHostname} is approved
            </Flex>
          </Heading>
          <Text size="2" color="gray">
            The terminal on {approvedHostname} carries on by itself: it writes the Claude Code settings, installs the plugin
            {withRunner ? ' and the laptop runner' : ''}, then checks the connection. You can close this page.
          </Text>
        </Flex>
      </Card>
    )
  }

  return (
    <Card size="3" className="pair-card">
      <form onSubmit={(submitEvent) => void approve(submitEvent)}>
        <Flex direction="column" gap="4">
          <Flex direction="column" gap="1">
            <Heading as="h2" size="4" weight="medium">
              Approve a machine
            </Heading>
            <Text size="2" color="gray">
              Approve only a code that a terminal of yours is showing right now. The machine gets a token to report its sessions
              here, and, if you tick it, one to run the sessions you start from the board.
            </Text>
          </Flex>
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="pairing-code">
              Code
            </Text>
            <TextField.Root
              id="pairing-code"
              size="3"
              autoFocus={typedCode === ''}
              autoComplete="off"
              placeholder="ABCD-2345"
              maxLength={12}
              value={typedCode}
              onChange={(changeEvent) => setTypedCode(changeEvent.target.value)}
              className="pairing-code"
            />
          </Flex>
          {lookupError !== null && (
            <Callout.Root color="red" variant="surface">
              <Callout.Text>{lookupError}. Codes last 10 minutes; run dashi connect again for a new one.</Callout.Text>
            </Callout.Root>
          )}
          {description !== null && (
            <>
              <Text size="2">
                <Text weight="medium">{description.hostname}</Text>, {platformLabels[description.platform]}, is waiting with this code.
              </Text>
              <Flex direction="column" gap="1">
                <Text as="label" size="2" weight="medium" htmlFor="machine-label">
                  Name it
                </Text>
                <TextField.Root
                  id="machine-label"
                  maxLength={80}
                  value={label}
                  onChange={(changeEvent) => setTypedLabel(changeEvent.target.value)}
                />
              </Flex>
              <Text as="label" size="2">
                <Flex gap="2" align="start">
                  <Checkbox checked={withRunner} onCheckedChange={(checked) => setWithRunner(checked === true)} />
                  Also run the sessions I start from the board on this machine (the laptop runner)
                </Flex>
              </Text>
              <Flex justify="end">
                <Button type="submit" size="3" loading={isApproving} disabled={label.trim().length === 0}>
                  Approve
                </Button>
              </Flex>
            </>
          )}
        </Flex>
      </form>
    </Card>
  )
}
