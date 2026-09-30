import { Card, Flex, Text } from '@radix-ui/themes'
import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string
  detail?: ReactNode
  isHero?: boolean
}

export const StatTile = ({ label, value, detail, isHero = false }: StatTileProps) => (
  <Card size="2">
    <Flex direction="column" gap="1">
      <Text size="2" color="gray">
        {label}
      </Text>
      <Text className={isHero ? 'stat-value stat-value-hero' : 'stat-value'} weight="medium">
        {value}
      </Text>
      {detail && (
        <Text size="1" color="gray">
          {detail}
        </Text>
      )}
    </Flex>
  </Card>
)
