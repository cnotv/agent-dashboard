import { ExternalLinkIcon } from '@radix-ui/react-icons'
import { Code, Flex, Link, Text } from '@radix-ui/themes'
import type { ServedScriptInfo } from '@dashi/contracts'
import { CopyableSnippet } from './CopyableSnippet'

const sourceRepositoryUrl = 'https://github.com/cnotv/dashi/blob/main'

interface Props {
  scriptName: string
  scriptInfo: ServedScriptInfo | null
  sourcePath: string
  doesList: string[]
  reviewSnippet: string | null
}

/**
 * Says where a script this dashboard serves comes from, its SHA-256, what it does, and how to read
 * it first, so it can be checked against the source before it runs.
 */
export const ServedScriptSource = ({ scriptName, scriptInfo, sourcePath, doesList, reviewSnippet }: Props) => (
  <Flex direction="column" gap="2">
    <Text size="2" weight="medium">
      Before you run it
    </Text>
    <Text size="2" color="gray">
      {scriptName} is one file,{' '}
      <Link href={`${sourceRepositoryUrl}/${scriptInfo?.sourcePath ?? sourcePath}`} target="_blank" rel="noopener noreferrer">
        {scriptInfo?.sourcePath ?? sourcePath} <ExternalLinkIcon />
      </Link>
      , served by this dashboard as it was deployed. Every command here checks that the file it downloads is exactly this one before
      anything runs:
    </Text>
    <Code size="1" className="runner-hash">
      SHA-256 {scriptInfo?.sha256 ?? 'loading…'}
    </Code>
    <Text size="2" color="gray">
      What it does:
    </Text>
    <ul className="runner-does-list">
      {doesList.map((itDoes) => (
        <li key={itDoes}>
          <Text size="2" color="gray">
            {itDoes}
          </Text>
        </li>
      ))}
    </ul>
    {reviewSnippet !== null && (
      <>
        <Text size="2" color="gray">
          To read it first, without running anything:
        </Text>
        <CopyableSnippet snippet={reviewSnippet} />
      </>
    )}
  </Flex>
)
