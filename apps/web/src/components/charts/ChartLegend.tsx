import { Flex, Text } from '@radix-ui/themes'

interface LegendEntry {
  entryKey: string
  label: string
  swatchClassName: string
}

/** A chart legend: a swatch in the series colour beside each label in text colour. */
export const ChartLegend = ({ entries }: { entries: LegendEntry[] }) => (
  <Flex gap="4" wrap="wrap" asChild>
    <ul className="chart-legend" aria-label="Legend">
      {entries.map((entry) => (
        <Flex key={entry.entryKey} gap="2" align="center" asChild>
          <li>
            <span className={`chart-swatch ${entry.swatchClassName}`} aria-hidden="true" />
            <Text size="1" color="gray">
              {entry.label}
            </Text>
          </li>
        </Flex>
      ))}
    </ul>
  </Flex>
)
