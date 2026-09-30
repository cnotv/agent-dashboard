import { GitHubLogoIcon } from '@radix-ui/react-icons'
import { Button, Callout, Card, Flex, Heading, Text } from '@radix-ui/themes'
import { useSearchParams } from 'react-router'
import { signInErrorMessages } from '@/lib/presentation'

/** The full-page sign-in shown when the dashboard requires GitHub sign-in, with the reason a previous attempt failed. */
export const SignInScreen = ({ signInUrl }: { signInUrl: string }) => {
  const [searchParams] = useSearchParams()
  const signInError = searchParams.get('sign-in-error')
  const errorMessage = signInError === null ? null : (signInErrorMessages[signInError] ?? signInErrorMessages.failed)

  return (
    <Flex className="sign-in-screen" align="center" justify="center" p="4">
      <Card size="4" className="sign-in-card">
        <Flex direction="column" gap="4">
          <Heading size="6" weight="medium">
            Agent dashboard
          </Heading>
          <Text color="gray" size="2">
            Sign in with a GitHub account on this dashboard&apos;s allowlist. The dashboard reads your issues and pull
            requests with that sign-in.
          </Text>
          {errorMessage !== null && (
            <Callout.Root color="red" variant="surface">
              <Callout.Text>{errorMessage}</Callout.Text>
            </Callout.Root>
          )}
          <Button size="3" asChild>
            <a href={signInUrl}>
              <GitHubLogoIcon />
              Sign in with GitHub
            </a>
          </Button>
        </Flex>
      </Card>
    </Flex>
  )
}
