"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT_COOLDOWN_MS = 60_000;
const TICK_INTERVAL_MS = 1_000;

interface UseResendCooldownOptions {
	/** Clé unique (typiquement email-scoped) pour persister le cooldown dans sessionStorage */
	storageKey: string;
	/** Durée du cooldown en millisecondes. Default 60s, aligné avec rate limits serveur. */
	cooldownMs?: number;
}

interface UseResendCooldownReturn {
	/** Secondes restantes (0 si pas de cooldown actif) */
	remainingSeconds: number;
	/** True si l'utilisateur doit patienter avant de renvoyer */
	isCoolingDown: boolean;
	/** Démarre un nouveau cooldown (ex: après submit réussi) */
	start: () => void;
}

function readTimestamp(storageKey: string): number {
	if (typeof window === "undefined") return 0;
	try {
		const raw = window.sessionStorage.getItem(storageKey);
		if (!raw) return 0;
		const ts = Number(raw);
		return Number.isFinite(ts) ? ts : 0;
	} catch {
		return 0;
	}
}

function writeTimestamp(storageKey: string, value: number): void {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(storageKey, String(value));
	} catch {
		// SessionStorage full ou bloqué (private mode) — silencieux
	}
}

/**
 * Cooldown anti-spam pour boutons "Renvoyer l'email" (password reset, verify email).
 *
 * Persiste le timestamp du dernier envoi dans sessionStorage (clé scoped par form)
 * pour survivre au refresh de page. Retourne secondes restantes + flag cooldown
 * pour désactiver le bouton et afficher "Renvoyer dans Xs".
 *
 * Aligné avec les rate limits serveur (`AUTH_RATE_LIMIT_RULES` : 3/min forgot-password, 5/min verify-email).
 *
 * @example
 * ```tsx
 * const { remainingSeconds, isCoolingDown, start } = useResendCooldown({
 *   storageKey: "password-reset-cooldown",
 * });
 *
 * <Button disabled={isCoolingDown} onClick={() => start()}>
 *   {isCoolingDown ? `Renvoyer dans ${remainingSeconds}s` : "Renvoyer"}
 * </Button>
 * ```
 */
export function useResendCooldown({
	storageKey,
	cooldownMs = DEFAULT_COOLDOWN_MS,
}: UseResendCooldownOptions): UseResendCooldownReturn {
	const [lastSent, setLastSent] = useState<number>(() => readTimestamp(storageKey));
	const [now, setNow] = useState<number>(() => Date.now());

	const remainingMs = lastSent ? Math.max(0, cooldownMs - (now - lastSent)) : 0;
	const isCoolingDown = remainingMs > 0;

	useEffect(() => {
		if (!isCoolingDown) return;
		const interval = setInterval(() => {
			setNow(Date.now());
		}, TICK_INTERVAL_MS);
		return () => clearInterval(interval);
	}, [isCoolingDown]);

	const start = useCallback(() => {
		const ts = Date.now();
		writeTimestamp(storageKey, ts);
		setLastSent(ts);
		setNow(ts);
	}, [storageKey]);

	return {
		remainingSeconds: Math.ceil(remainingMs / 1000),
		isCoolingDown,
		start,
	};
}
