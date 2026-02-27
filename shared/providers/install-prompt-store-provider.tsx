"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useStore } from "zustand";

import { createInstallPromptStore } from "@/shared/stores/install-prompt-store";
import type {
	InstallPromptStore,
	InstallPromptStoreProviderProps,
} from "@/shared/types/store.types";

export type InstallPromptStoreApi = ReturnType<typeof createInstallPromptStore>;

export const InstallPromptStoreContext = createContext<InstallPromptStoreApi | undefined>(
	undefined,
);

export const InstallPromptStoreProvider = ({ children }: InstallPromptStoreProviderProps) => {
	const [store] = useState(() => createInstallPromptStore());

	// Hydrate + record visit in a single effect; skip visit if permanently dismissed
	useEffect(() => {
		const state = store.getState();
		if (!state._hasHydrated) {
			store.setState({ _hasHydrated: true });
		}
		if (!state.permanentlyDismissed) {
			state.recordVisit();
		}
	}, [store]);

	return (
		<InstallPromptStoreContext.Provider value={store}>
			{children}
		</InstallPromptStoreContext.Provider>
	);
};

export const useInstallPromptStore = <T,>(selector: (store: InstallPromptStore) => T): T => {
	const installPromptStoreContext = useContext(InstallPromptStoreContext);

	if (!installPromptStoreContext) {
		throw new Error(`useInstallPromptStore must be used within InstallPromptStoreProvider`);
	}

	return useStore(installPromptStoreContext, selector);
};
