import { useContext } from 'react'
import { ToastContext } from '@/lib/toast-context'
import type { ToastApi } from '@/lib/types'

/**
 * Gives a component the success and error notifiers.
 * @returns The toast notifiers; throws outside ToastProvider.
 */
export const useToast = (): ToastApi => {
  const toastApi = useContext(ToastContext)
  if (toastApi === null) throw new Error('useToast must be used inside ToastProvider')
  return toastApi
}
