"use client"

import { createContext, useContext, useRef, useEffect } from "react"
import { useStore } from "zustand"

import { createInstallPromptStore } from "@/shared/stores/install-prompt-store"
import type {
	InstallPromptStore,
	InstallPromptStoreProviderProps,
} from "@/shared/types/store.types"

export type InstallPromptStoreApi = ReturnType<
	typeof createInstallPromptStore
>

export const InstallPromptStoreContext = createContext<
	InstallPromptStoreApi | undefined
>(undefined)

export const InstallPromptStoreProvider = ({
	children,
}: InstallPromptStoreProviderProps) => {
	const storeRef = useRef<InstallPromptStoreApi | null>(null)
	if (storeRef.current === null) {
		storeRef.current = createInstallPromptStore()
	}

	// Hydrate + record visit in a single effect; skip visit if permanently dismissed
	useEffect(() => {
		if (!storeRef.current) return
		const state = storeRef.current.getState()
		if (!state._hasHydrated) {
			storeRef.current.setState({ _hasHydrated: true })
		}
		if (!state.permanentlyDismissed) {
			state.recordVisit()
		}
	}, [])

	return (
		<InstallPromptStoreContext.Provider value={storeRef.current}>
			{children}
		</InstallPromptStoreContext.Provider>
	)
}

export const useInstallPromptStore = <T,>(
	selector: (store: InstallPromptStore) => T
): T => {
	const installPromptStoreContext = useContext(InstallPromptStoreContext)

	if (!installPromptStoreContext) {
		throw new Error(
			`useInstallPromptStore must be used within InstallPromptStoreProvider`
		)
	}

	return useStore(installPromptStoreContext, selector)
}
