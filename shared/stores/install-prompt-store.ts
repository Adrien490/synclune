import { createStore } from "zustand/vanilla"
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware"

import type {
	InstallPromptState,
	InstallPromptStore,
} from "@/shared/types/store.types"

export type {
	InstallPromptState,
	InstallPromptActions,
	InstallPromptStore,
} from "@/shared/types/store.types"

// Noop storage for SSR (when localStorage is not available)
const noopStorage: StateStorage = {
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
}

const MAX_DISMISS_COUNT = 3

export const defaultInitState: InstallPromptState = {
	visitCount: 0,
	dismissCount: 0,
	permanentlyDismissed: false,
	bannerVisible: false,
	_hasHydrated: false,
}

/**
 * Zustand store for the PWA install prompt banner.
 *
 * Tracks visit count, dismiss count, and permanent dismissal.
 * Banner shows after 2+ visits unless permanently dismissed (3 dismissals).
 * Persists in localStorage under "install-prompt".
 */
export const createInstallPromptStore = (
	initState: InstallPromptState = defaultInitState
) => {
	return createStore<InstallPromptStore>()(
		persist(
			(set, get) => ({
				...initState,

				recordVisit: () => {
					const { visitCount, permanentlyDismissed } = get()
					const newCount = visitCount + 1
					set({
						visitCount: newCount,
						bannerVisible: newCount >= 2 && !permanentlyDismissed,
					})
				},

				dismissForSession: () => {
					const { dismissCount } = get()
					const newDismissCount = dismissCount + 1
					set({
						dismissCount: newDismissCount,
						bannerVisible: false,
						permanentlyDismissed: newDismissCount >= MAX_DISMISS_COUNT,
					})
				},

				markInstalled: () => {
					set({
						permanentlyDismissed: true,
						bannerVisible: false,
					})
				},

				showBanner: () => {
					if (!get().permanentlyDismissed) {
						set({ bannerVisible: true })
					}
				},

				hideBanner: () => {
					set({ bannerVisible: false })
				},
			}),
			{
				name: "install-prompt",
				storage: createJSONStorage(() =>
					typeof window !== "undefined" ? localStorage : noopStorage
				),
				partialize: (state) => ({
					visitCount: state.visitCount,
					dismissCount: state.dismissCount,
					permanentlyDismissed: state.permanentlyDismissed,
				}),
				onRehydrateStorage: () => (state) => {
					if (state) {
						state.bannerVisible =
							state.visitCount >= 2 && !state.permanentlyDismissed
						state._hasHydrated = true
					}
				},
			}
		)
	)
}
