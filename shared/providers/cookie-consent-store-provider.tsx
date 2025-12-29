"use client"

import { createContext, useContext, useRef, useEffect } from "react"
import { useStore } from "zustand"

import {
	createCookieConsentStore,
	CURRENT_POLICY_VERSION,
} from "@/shared/stores/cookie-consent-store"
import type {
	CookieConsentStore,
	CookieConsentStoreProviderProps,
} from "@/shared/types/store.types"

export type CookieConsentStoreApi = ReturnType<
	typeof createCookieConsentStore
>

export const CookieConsentStoreContext = createContext<
	CookieConsentStoreApi | undefined
>(undefined)

export const CookieConsentStoreProvider = ({
	children,
}: CookieConsentStoreProviderProps) => {
	const storeRef = useRef<CookieConsentStoreApi | null>(null);
	if (storeRef.current === null) {
		storeRef.current = createCookieConsentStore();
	}

	// NÉCESSAIRE: useEffect pour marquer l'hydratation comme terminée
	// Zustand persist middleware appelle onRehydrateStorage uniquement s'il y a des données persistées.
	// Pour les premiers visiteurs (pas de localStorage), onRehydrateStorage ne se déclenche jamais.
	// Ce useEffect sert de fallback pour garantir que _hasHydrated passe à true après le mount client.
	// Cela évite un flash où le banner de cookies s'affiche puis disparaît.
	useEffect(() => {
		if (storeRef.current) {
			const currentState = storeRef.current.getState();
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
