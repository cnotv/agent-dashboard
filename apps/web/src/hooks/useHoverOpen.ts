import { useEffect, useRef, useState, type PointerEvent } from 'react'

const openDelayMilliseconds = 150
// Long enough to cross the gap between the button and the popover without it closing.
const closeDelayMilliseconds = 300

const isMouse = (pointerEvent: PointerEvent): boolean => pointerEvent.pointerType === 'mouse'

/**
 * Opens a popover while a mouse rests on its trigger or its content. Touch and pen are left to
 * the click that already toggles it, since they have no hover.
 * @returns The open state, its setter, and the pointer handlers for the trigger and the content.
 */
export const useHoverOpen = () => {
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  const clearTimer = (): void => window.clearTimeout(timerRef.current)

  useEffect(() => clearTimer, [])

  const scheduleOpen = (): void => {
    clearTimer()
    timerRef.current = window.setTimeout(() => setIsOpen(true), openDelayMilliseconds)
  }

  // Full screen moves the pointer off the popover; closing then would unmount the video playing in it.
  const scheduleClose = (): void => {
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      if (document.fullscreenElement === null) setIsOpen(false)
    }, closeDelayMilliseconds)
  }

  return {
    isOpen,
    setIsOpen: (nextOpen: boolean): void => {
      clearTimer()
      setIsOpen(nextOpen)
    },
    triggerHoverHandlers: {
      onPointerEnter: (pointerEvent: PointerEvent) => isMouse(pointerEvent) && scheduleOpen(),
      onPointerLeave: (pointerEvent: PointerEvent) => isMouse(pointerEvent) && scheduleClose(),
    },
    contentHoverHandlers: {
      onPointerEnter: (pointerEvent: PointerEvent) => isMouse(pointerEvent) && clearTimer(),
      onPointerLeave: (pointerEvent: PointerEvent) => isMouse(pointerEvent) && scheduleClose(),
    },
  }
}
