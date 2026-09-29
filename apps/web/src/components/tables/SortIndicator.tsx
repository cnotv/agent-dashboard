import { CaretDownIcon, CaretSortIcon, CaretUpIcon } from '@radix-ui/react-icons'

export const SortIndicator = ({ direction }: { direction: false | 'asc' | 'desc' }) =>
  direction === 'asc' ? <CaretUpIcon /> : direction === 'desc' ? <CaretDownIcon /> : <CaretSortIcon color="var(--gray-8)" />
