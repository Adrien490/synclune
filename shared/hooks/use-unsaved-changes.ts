"use client";

import { useEffect } from "react";

/**
 * Hook to warn users about unsaved changes before leaving the page.
 * Shows the native browser confirmation dialog when attempting to close/refresh/navigate away.
 *
 * @param isDirty - Whether the form has unsaved changes
 * @param enabled - Whether the warning is enabled (default: true)
 */
export function useUnsavedChanges(isDirty: boolean, enabled = true) {
	useEffect(() => {
		if (!enabled || !isDirty) return;

		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			// Standard way to trigger the browser's "unsaved changes" dialog
			e.preventDefault();
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [isDirty, enabled]);
}
