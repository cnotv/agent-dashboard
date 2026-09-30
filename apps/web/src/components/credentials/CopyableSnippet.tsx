import { Button, Flex } from '@radix-ui/themes'
import { useToast } from '@/hooks/useToast'

/** A block of commands or settings to paste elsewhere, with a Copy button under it. */
export const CopyableSnippet = ({ snippet }: { snippet: string }) => {
  const toast = useToast()
  const copySnippet = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(snippet)
      toast.notifySuccess('Copied')
    } catch (copyError) {
      toast.notifyError(copyError)
    }
  }
  return (
    <Flex direction="column" gap="2">
      <pre className="connect-snippet">{snippet}</pre>
      <Flex justify="end">
        <Button size="1" variant="soft" color="gray" onClick={() => void copySnippet()}>
          Copy
        </Button>
      </Flex>
    </Flex>
  )
}
