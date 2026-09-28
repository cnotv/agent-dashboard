import { DashboardIcon, LockClosedIcon } from '@radix-ui/react-icons'
import { Box, Flex, Heading, Text } from '@radix-ui/themes'
import { NavLink, Outlet, useMatches } from 'react-router'

const navigationItems = [
  { title: 'Issues', path: '/issues', Icon: DashboardIcon },
  { title: 'Credentials', path: '/credentials', Icon: LockClosedIcon },
]

const readPageTitle = (handle: unknown): string | null =>
  typeof handle === 'object' && handle !== null && 'title' in handle && typeof handle.title === 'string' ? handle.title : null

export const AppShell = () => {
  const pageTitle = useMatches()
    .map((match) => readPageTitle(match.handle))
    .filter((title): title is string => title !== null)
    .at(-1)

  return (
    <div className="app-shell">
      <nav className="app-sidebar" aria-label="Main">
        <Text as="div" size="2" weight="bold" className="app-sidebar-title">
          Agent dashboard
        </Text>
        <Flex direction="column" gap="1">
          {navigationItems.map(({ title, path, Icon }) => (
            <NavLink key={path} to={path} className="app-nav-link">
              <Icon />
              <Text size="2">{title}</Text>
            </NavLink>
          ))}
        </Flex>
      </nav>
      <Box className="app-content">
        <header className="app-header">
          <Heading size="5" weight="medium">
            {pageTitle}
          </Heading>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </Box>
    </div>
  )
}
