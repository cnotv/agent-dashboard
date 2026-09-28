import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons'
import { Card, Flex, Text } from '@radix-ui/themes'
import { Toast } from 'radix-ui'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { errorMessageOf } from '@/lib/presentation'
import { ToastContext } from '@/lib/toast-context'
import type { ToastApi, ToastMessage, ToastTone } from '@/lib/types'

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([])

  const pushToast = useCallback((text: string, tone: ToastTone) => {
    setToastMessages((currentMessages) => [...currentMessages, { toastId: Date.now() + Math.random(), text, tone }])
  }, [])

  const removeToast = useCallback((toastId: number) => {
    setToastMessages((currentMessages) => currentMessages.filter((message) => message.toastId !== toastId))
  }, [])

  const toastApi = useMemo<ToastApi>(
    () => ({
      notifySuccess: (text) => pushToast(text, 'success'),
      notifyError: (errorOrText) => pushToast(errorMessageOf(errorOrText), 'error'),
    }),
    [pushToast],
  )

  return (
    <ToastContext.Provider value={toastApi}>
      <Toast.Provider duration={4000} swipeDirection="right">
        {children}
        {toastMessages.map((message) => (
          <Toast.Root
            key={message.toastId}
            className="toast"
            onOpenChange={(isOpen) => !isOpen && removeToast(message.toastId)}
            asChild
          >
            <Card size="2">
              <Flex gap="2" align="center">
                {message.tone === 'success' ? (
                  <CheckCircledIcon color="var(--green-11)" />
                ) : (
                  <CrossCircledIcon color="var(--red-11)" />
                )}
                <Toast.Title asChild>
                  <Text size="2">{message.text}</Text>
                </Toast.Title>
              </Flex>
            </Card>
          </Toast.Root>
        ))}
        <Toast.Viewport className="toast-viewport" />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}
