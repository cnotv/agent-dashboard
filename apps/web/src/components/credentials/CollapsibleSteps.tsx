import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons'
import { Button, Flex } from '@radix-ui/themes'
import { useId, type ReactNode } from 'react'

interface Props {
  label: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  children: ReactNode
}

/** A procedure folded under its card until it is wanted, so the page stays short. */
export const CollapsibleSteps = ({ label, isOpen, onOpenChange, children }: Props) => {
  const contentId = useId()
  return (
    <Flex direction="column" gap="4">
      <Flex>
        <Button size="2" variant="soft" aria-expanded={isOpen} aria-controls={contentId} onClick={() => onOpenChange(!isOpen)}>
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          {label}
        </Button>
      </Flex>
      {isOpen && (
        <Flex id={contentId} direction="column" gap="4">
          {children}
        </Flex>
      )}
    </Flex>
  )
}
