"use client";

import {
	type ReactNode,
	createContext,
	useContext,
	useRef,
	useEffect,
} from "react";
import { useStore } from "zustand";

import {
	type CookieConsentStore,
	createCookieConsentStore,
	CURRENT_POLICY_VERSION,
} from "@/shared/stores/cookie-consent-store";

export type CookieConsentStoreApi = ReturnType<
	typeof createCookieConsentStore
>;

export const CookieConsentStoreContext = createContext<
	CookieConsentStoreApi | undefined
>(undefined);

export interface CookieConsentStoreProviderProps {
	children: ReactNode;
}

export const CookieConsentStoreProvider = ({
	children,
}: CookieConsentStoreProviderProps) => {
	const storeRef = useRef<CookieConsentStoreApi | null>(null);
	if (storeRef.current === null) {
		storeRef.current = createCookieConsentStore();
	}

	// Ensure hydration is marked complete after mount (fallback for first visit)
	useEffect(() => {
		if (storeRef.current) {
			const currentState = storeRef.current.getState();

			// If not hydrated yet, mark as hydrated now
			// This handles the case where there's no persisted state (first visit)
			if (!currentState._hasHydrated) {
				storeRef.current.setState({ _hasHydrated: true });
			}
		}
	}, []);

	return (
		<CookieConsentStoreContext.Provider value={storeRef.current}>
			{children}
		</CookieConsentStoreContext.Provider>
	);
};

export const useCookieConsentStore = <T,>(
	selector: (store: CookieConsentStore) => T
): T => {
	const cookieConsentStoreContext = useContext(CookieConsentStoreContext);

	if (!cookieConsentStoreContext) {
		throw new Error(
			`useCookieConsentStore must be used within CookieConsentStoreProvider`
		);
	}

	return useStore(cookieConsentStoreContext, selector);
};

/**
 * Hook pour vérifier si l'utilisateur a déjà fait un choix
 * @returns true si consentement déjà donné
 */
export const useHasConsented = (): boolean => {
	return useCookieConsentStore(
		(state) => state.policyVersion >= CURRENT_POLICY_VERSION
	);
};
