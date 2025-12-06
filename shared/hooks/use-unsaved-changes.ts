"use client"

import { useEffect, useRef } from "react"

const DEFAULT_MESSAGE = "Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page?"

interface UseUnsavedChangesOptions {
	/**
	 * Message to display in the browser dialog (note: most browsers ignore custom messages)
	 */
	message?: string
	/**
	 * Callback when navigation is blocked (useful for showing a custom modal)
	 */
	onBlock?: () => void
	/**
	 * Whether to intercept browser back/forward navigation
	 * @default true
	 */
	interceptHistoryNavigation?: boolean
}

/**
 * Hook to warn users about unsaved changes before leaving the page.
 * Shows the native browser confirmation dialog when attempting to close/refresh/navigate away.
 *
 * Features:
 * - Browser tab close/refresh protection (beforeunload)
 * - Browser back/forward button protection (popstate)
 * - Custom message support (though most browsers use a generic message)
 * - Optional callback when navigation is blocked
 *
 * @param isDirty - Whether the form has unsaved changes
 * @param enabled - Whether the warning is enabled (default: true)
 * @param options - Additional configuration options
 *
 * @example
 * ```tsx
 * // Simple usage
 * useUnsavedChanges(form.state.isDirty)
 *
 * // With options
 * useUnsavedChanges(form.state.isDirty, true, {
 *   message: "Changes not saved!",
 *   onBlock: () => setShowWarningModal(true),
 * })
 *
 * // Conditional
 * useUnsavedChanges(form.state.isDirty && !isSubmitting)
 * ```
 */
export function useUnsavedChanges(
	isDirty: boolean,
	enabled = true,
	options: UseUnsavedChangesOptions = {}
) {
	const {
		message = DEFAULT_MESSAGE,
		onBlock,
		interceptHistoryNavigation = true,
	} = options

	// Track if we're currently blocking to avoid recursive calls
	const isBlockingRef = useRef(false)

	// Handler for browser close/refresh
	const handleBeforeUnload = (e: BeforeUnloadEvent) => {
		// Standard way to trigger the browser's "unsaved changes" dialog
		e.preventDefault()
		// For older browsers, setting returnValue is necessary
		e.returnValue = message
		return message
	}

	// Handler for browser back/forward navigation
	const handlePopState = () => {
		if (isBlockingRef.current) return

		// Show confirmation dialog
		// eslint-disable-next-line no-alert
		const shouldLeave = window.confirm(message)

		if (shouldLeave) {
			// User confirmed, allow navigation
			return
		}

		// User cancelled, restore the current URL
		isBlockingRef.current = true
		window.history.pushState(null, "", window.location.href)
		isBlockingRef.current = false

		// Call the onBlock callback if provided
		onBlock?.()
	}

	// Setup beforeunload listener
	useEffect(() => {
		if (!enabled || !isDirty) return

		window.addEventListener("beforeunload", handleBeforeUnload)

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload)
		}
	}, [isDirty, enabled, message])

	// Setup popstate listener for browser navigation
	useEffect(() => {
		if (!enabled || !isDirty || !interceptHistoryNavigation) return

		// Push a state to be able to intercept back navigation
		window.history.pushState(null, "", window.location.href)

		window.addEventListener("popstate", handlePopState)

		return () => {
			window.removeEventListener("popstate", handlePopState)
		}
	}, [isDirty, enabled, interceptHistoryNavigation, message, onBlock])
}

/**
 * Hook variant that accepts an object for more explicit configuration
 */
export function useUnsavedChangesWithOptions(options: {
	isDirty: boolean
	enabled?: boolean
	message?: string
	onBlock?: () => void
	interceptHistoryNavigation?: boolean
}) {
	const { isDirty, enabled = true, ...rest } = options
	return useUnsavedChanges(isDirty, enabled, rest)
}
