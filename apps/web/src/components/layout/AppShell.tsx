import { ActivityLogIcon, BarChartIcon, DashboardIcon, LockClosedIcon } from '@radix-ui/react-icons'
import { Box, Callout, Flex, Heading, Text } from '@radix-ui/themes'
import { NavLink, Outlet, useMatches } from 'react-router'
import { useSession } from '@/hooks/useSession'
import { useToast } from '@/hooks/useToast'
import { runtimeConfiguration } from '@/lib/runtime-configuration'
import { SidebarAccount } from './SidebarAccount'
import { SignInScreen } from './SignInScreen'

const navigationItems = [
  { title: 'Sessions', path: '/sessions', Icon: ActivityLogIcon },
  { title: 'Issues', path: '/issues', Icon: DashboardIcon },
  { title: 'Usage', path: '/usage', Icon: BarChartIcon },
  { title: 'Credentials', path: '/credentials', Icon: LockClosedIcon },
]

const readPageTitle = (handle: unknown): string | null =>
  typeof handle === 'object' && handle !== null && 'title' in handle && typeof handle.title === 'string' ? handle.title : null

/** The page frame: the sidebar, the page title and the current view, or the sign-in screen when sign-in is required. */
/** The page frame: the sidebar, the page title and the current view, or the sign-in screen when sign-in is required. */
/** The page frame: the sidebar, the page title and the current view, or the sign-in screen when sign-in is required. */
export const AppShell = () => {
  const pageTitle = useMatches()
    .map((match) => readPageTitle(match.handle))
    .filter((title): title is string => title !== null)
    .at(-1)
  const { notifyError } = useToast()
  const { sessionState, signOut, signInUrl } = useSession(notifyError)

  if (sessionState === null) return null
  if (sessionState.signInRequired && sessionState.user === null) return <SignInScreen signInUrl={signInUrl} />

  return (
    <div className="app-shell">
      <nav className="app-sidebar" aria-label="Main">
        <Text as="div" size="2" weight="bold" className="app-sidebar-title">
          Agent dashboard
        </Text>
        <Flex direction="column" gap="1" className="app-nav-list">
          {navigationItems.map(({ title, path, Icon }) => (
            <NavLink key={path} to={path} className="app-nav-link">
              <Icon />
              <Text size="2">{title}</Text>
            </NavLink>
          ))}
        </Flex>
        <SidebarAccount
          sessionState={sessionState}
          signInUrl={signInUrl}
          onSignOut={() => {
            signOut().catch(notifyError)
          }}
        />
      </nav>
      <Box className="app-content">
        <header className="app-header">
          <Heading size="5" weight="medium">
            {pageTitle}
          </Heading>
        </header>
        <main className="app-main">
          {runtimeConfiguration.isDemoMode && (
            <Callout.Root variant="surface" mb="5">
              <Callout.Text>
                <Text weight="medium">Demo mode.</Text> Sample data and no server: nothing you type leaves this page. Run
                the dashboard server, or build with VITE_API_BASE_URL pointing at one, to see real repositories.
              </Callout.Text>
            </Callout.Root>
          )}
          <Outlet />
        </main>
      </Box>
    </div>
  )
}
