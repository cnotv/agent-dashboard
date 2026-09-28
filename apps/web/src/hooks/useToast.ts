import { useContext } from 'react'
import { ToastContext } from '@/lib/toast-context'
import type { ToastApi } from '@/lib/types'

export const useToast = (): ToastApi => {
  const toastApi = useContext(ToastContext)
  if (toastApi === null) throw new Error('useToast must be used inside ToastProvider')
  return toastApi
}
