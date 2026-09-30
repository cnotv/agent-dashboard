import { ExitIcon, GitHubLogoIcon } from '@radix-ui/react-icons'
import { Avatar, Button, Flex, IconButton, Text, Tooltip } from '@radix-ui/themes'
import type { SessionState } from '@agent-dashboard/contracts'

interface Props {
  sessionState: SessionState
  signInUrl: string
  onSignOut: () => void
}

/** The signed-in account at the foot of the sidebar, or the sign-in button when sign-in is optional. */
export const SidebarAccount = ({ sessionState, signInUrl, onSignOut }: Props) => {
  const { user } = sessionState
  if (user === null) {
    return sessionState.signInAvailable ? (
      <Button variant="soft" size="2" asChild className="sidebar-account">
        <a href={signInUrl} aria-label="Sign in with GitHub">
          <GitHubLogoIcon />
          <span className="sidebar-account-label">Sign in with GitHub</span>
        </a>
      </Button>
    ) : null
  }
  return (
    <Flex align="center" gap="2" className="sidebar-account">
      <Avatar size="2" radius="full" src={user.avatarUrl || undefined} fallback={user.login.slice(0, 1).toUpperCase()} />
      <Text size="2" truncate className="sidebar-account-label">
        {user.login}
      </Text>
      {sessionState.signInAvailable && (
        <Tooltip content="Sign out">
          <IconButton variant="ghost" color="gray" size="2" aria-label="Sign out" onClick={onSignOut}>
            <ExitIcon />
          </IconButton>
        </Tooltip>
      )}
    </Flex>
  )
}
