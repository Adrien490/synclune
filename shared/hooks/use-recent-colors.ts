"use client";

import { useSyncExternalStore } from "react";

/**
 * Couleurs récemment validées par l'admin (hex normalisés), persistées en
 * localStorage pour réutilisation rapide entre créations/éditions de couleurs.
 *
 * - Store externe avec cache de snapshot stable (évite la boucle infinie
 *   useSyncExternalStore) + invalidation sur `storage` (cross-tab) et sur un
 *   event custom (même onglet).
 * - SSR-safe : `getServerSnapshot` renvoie un tableau vide stable.
 */

const STORAGE_KEY = "synclune:recent-colors";
const MAX_RECENT = 6;
const EVENT = "synclune:recent-colors-change";

const EMPTY: readonly string[] = [];

// Cache du dernier snapshot pour garantir une référence stable tant que le
// contenu localStorage ne change pas (contrat useSyncExternalStore).
let cachedRaw: string | null = null;
let cachedParsed: readonly string[] = EMPTY;

/**
 * Accès défensif à localStorage : renvoie null si indisponible (SSR, mode privé
 * Safari, ou environnement de test dont le shim n'implémente pas l'API). Évite
 * un crash render quand `window.localStorage.getItem` n'est pas une fonction.
 */
function safeLocalStorage(): Storage | null {
	try {
		if (typeof window === "undefined") return null;
		// Accès via `unknown` volontaire : l'env de test fournit parfois un shim
		// dont `getItem`/`setItem` ne sont pas des fonctions, alors que les types
		// DOM affirment `localStorage: Storage` non-nullable. On valide donc à
		// l'exécution plutôt que de faire confiance au type.
		const ls = (globalThis as { localStorage?: unknown }).localStorage as Storage | undefined;
		if (!ls || typeof ls.getItem !== "function" || typeof ls.setItem !== "function") {
			return null;
		}
		return ls;
	} catch {
		return null;
	}
}

function readSnapshot(): readonly string[] {
	const ls = safeLocalStorage();
	if (!ls) return EMPTY;
	const raw = ls.getItem(STORAGE_KEY);
	if (raw === cachedRaw) return cachedParsed;
	cachedRaw = raw;
	if (!raw) {
		cachedParsed = EMPTY;
		return cachedParsed;
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		cachedParsed = Array.isArray(parsed)
			? parsed.filter((v): v is string => typeof v === "string")
			: EMPTY;
	} catch {
		cachedParsed = EMPTY;
	}
	return cachedParsed;
}

function subscribe(callback: () => void): () => void {
	if (typeof window === "undefined") return () => {};
	const onStorage = (event: StorageEvent) => {
		if (event.key === STORAGE_KEY) callback();
	};
	window.addEventListener("storage", onStorage);
	window.addEventListener(EVENT, callback);
	return () => {
		window.removeEventListener("storage", onStorage);
		window.removeEventListener(EVENT, callback);
	};
}

function getServerSnapshot(): readonly string[] {
	return EMPTY;
}

/**
 * Ajoute un hex en tête de la liste des récents (dédupliqué, plafonné).
 * À appeler après une création/édition réussie.
 */
export function pushRecentColor(hex: string): void {
	const ls = safeLocalStorage();
	if (!ls) return;
	const normalized = hex.trim().toUpperCase();
	if (!/^#[0-9A-F]{6}$/.test(normalized)) return;
	const current = readSnapshot();
	const next = [normalized, ...current.filter((c) => c !== normalized)].slice(0, MAX_RECENT);
	ls.setItem(STORAGE_KEY, JSON.stringify(next));
	window.dispatchEvent(new Event(EVENT));
}

export function useRecentColors(): readonly string[] {
	return useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
}
