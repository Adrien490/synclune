"use client";

import { toast as sonnerToast } from "sonner";

import { triggerHaptic } from "@/shared/hooks/use-haptic";

/**
 * Wrapper toast central pour Synclune — haptics natives + sanitisation d'erreurs
 * + annonce screen-reader + duration adaptative à la densité lexicale.
 *
 * API identique à `sonner` (drop-in replacement) avec quatre ajouts :
 * 1. Haptic feedback automatique sur success/error/warning (pattern `useHaptic`).
 *    Silencieux sur iOS Safari (Vibration API ignorée), actif sur Android & PWA.
 * 2. Sanitisation des messages techniques passés à `error(...)` : si le message
 *    contient un pattern typique d'erreur bas-niveau (stack trace, code Prisma,
 *    "fetch failed", etc.), il est remplacé par un message générique FR.
 * 3. Annonce screen-reader via région `aria-live` (WCAG 4.1.3 Status Messages).
 *    Les régions DOM sont montées par `<AppToaster />` — cf toaster.tsx.
 * 4. Duration adaptative (WPS-based) : messages longs restent plus longtemps,
 *    erreurs persistent au moins 5s (parité iOS Live Activities).
 */

const GENERIC_ERROR_MESSAGE = "Une erreur est survenue. Merci de réessayer.";

const TECHNICAL_ERROR_PATTERNS: readonly RegExp[] = [
	/\bprisma\b/i,
	/\bP\d{4}\b/,
	/fetch\s*failed/i,
	/network\s*error/i,
	/NetworkError\b/,
	/TypeError\b/,
	/ReferenceError\b/,
	/SyntaxError\b/,
	/undefined\s+is\s+not/i,
	/null\s+is\s+not/i,
	/cannot\s+read\s+propert(y|ies)/i,
	/is\s+not\s+a\s+function/i,
	/at\s+\w+\s+\(/,
	/ECONN(REFUSED|RESET|ABORTED)/,
	/ETIMEDOUT/,
	/\bundefined\b/,
];

const MAX_ERROR_MESSAGE_LENGTH = 200;

function sanitizeErrorMessage(message: string): string {
	if (!message) return GENERIC_ERROR_MESSAGE;
	if (message.length > MAX_ERROR_MESSAGE_LENGTH) return GENERIC_ERROR_MESSAGE;
	if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
		return GENERIC_ERROR_MESSAGE;
	}
	return message;
}

/**
 * Duration adaptative basée sur la densité lexicale (FR, lecture moyenne ~2.5 mots/s).
 * Les seuils min par type reflètent l'urgence : error persiste 5s min, success 2s.
 */
const WORDS_PER_SECOND = 2.5;
const MIN_DURATION: Record<"success" | "info" | "warning" | "error", number> = {
	success: 2000,
	info: 2500,
	warning: 4000,
	error: 5000,
};

function computeDuration(message: unknown, type: keyof typeof MIN_DURATION): number {
	if (typeof message !== "string" || message.length === 0) return MIN_DURATION[type];
	const words = message.trim().split(/\s+/).length;
	const readTime = Math.ceil((words / WORDS_PER_SECOND) * 1000) + 500;
	return Math.max(MIN_DURATION[type], readTime);
}

/**
 * Met à jour une région sr-only pour forcer VoiceOver/TalkBack à annoncer le toast.
 * Sonner 2.0 n'expose pas `aria-live` sur son conteneur (audit WCAG 4.1.3 échoué
 * par défaut). On double-passe : clear → rAF → set, sinon re-assignation du même
 * texte n'est pas re-annoncée.
 */
function announceToScreenReader(message: unknown, level: "polite" | "assertive"): void {
	if (typeof document === "undefined") return;
	if (typeof message !== "string" || message.length === 0) return;
	const id = level === "assertive" ? "toast-live-assertive" : "toast-live-polite";
	const node = document.getElementById(id);
	if (!node) return;
	node.textContent = "";
	requestAnimationFrame(() => {
		node.textContent = message;
	});
}

/**
 * Détecte un viewport mobile (≤ 767px) — aligné sur `MOBILE_BREAKPOINT` du hook
 * `useIsMobile`. Sur mobile, l'état pending des boutons (spinner + label) suffit ;
 * un toast loading consommerait l'unique slot visible (`visibleToasts: 1`) et
 * masquerait du contenu.
 */
function isMobileViewport(): boolean {
	if (typeof window === "undefined") return false;
	if (typeof window.matchMedia !== "function") return false;
	return window.matchMedia("(max-width: 767px)").matches;
}

/**
 * Priority lane : si un toast `error` arrive et qu'un toast success/info/warning
 * est visible, on dismiss le précédent pour laisser place à l'erreur critique.
 * Sans ça, avec `visibleToasts={1}` (mobile portrait), l'error attend en queue.
 */
let lastNonErrorToastId: string | number | null = null;

function clearPendingNonError(): void {
	if (lastNonErrorToastId !== null) {
		// Guard for partial mocks in unit tests (some mock only success/error)
		if (typeof sonnerToast.dismiss === "function") {
			sonnerToast.dismiss(lastNonErrorToastId);
		}
		lastNonErrorToastId = null;
	}
}

type SonnerToast = typeof sonnerToast;
type ExternalToastOptions = Parameters<SonnerToast["success"]>[1];

export const toast = {
	success: (message: Parameters<SonnerToast["success"]>[0], opts?: ExternalToastOptions) => {
		triggerHaptic("success");
		announceToScreenReader(message, "polite");
		const duration = opts?.duration ?? computeDuration(message, "success");
		const id = sonnerToast.success(message, { ...opts, duration });
		lastNonErrorToastId = id;
		return id;
	},
	error: (message: Parameters<SonnerToast["error"]>[0], opts?: ExternalToastOptions) => {
		triggerHaptic("error");
		const sanitized = typeof message === "string" ? sanitizeErrorMessage(message) : message;
		announceToScreenReader(sanitized, "assertive");
		clearPendingNonError();
		const duration = opts?.duration ?? computeDuration(sanitized, "error");
		return sonnerToast.error(sanitized, { ...opts, duration });
	},
	warning: (message: Parameters<SonnerToast["warning"]>[0], opts?: ExternalToastOptions) => {
		triggerHaptic("medium");
		announceToScreenReader(message, "polite");
		const duration = opts?.duration ?? computeDuration(message, "warning");
		const id = sonnerToast.warning(message, { ...opts, duration });
		lastNonErrorToastId = id;
		return id;
	},
	info: ((message: Parameters<SonnerToast["info"]>[0], opts?: ExternalToastOptions) => {
		announceToScreenReader(message, "polite");
		const duration = opts?.duration ?? computeDuration(message, "info");
		const id = sonnerToast.info(message, { ...opts, duration });
		lastNonErrorToastId = id;
		return id;
	}) as SonnerToast["info"],
	message: ((...args: Parameters<SonnerToast["message"]>) =>
		sonnerToast.message(...args)) as SonnerToast["message"],
	loading: ((...args: Parameters<SonnerToast["loading"]>) => {
		// Mobile : pas de toast loading, l'état pending du bouton suffit.
		if (isMobileViewport()) return undefined as never;
		return sonnerToast.loading(...args);
	}) as SonnerToast["loading"],
	dismiss: ((...args: Parameters<SonnerToast["dismiss"]>) =>
		sonnerToast.dismiss(...args)) as SonnerToast["dismiss"],
	/**
	 * `toast.promise(promise, { loading, success, error })` morph le toast
	 * loading → success/error sans unmount/mount (pattern Dynamic Island iOS 18).
	 * Le wrapper ajoute : haptic success/error, sanitize error, sr-only announce.
	 *
	 * Mobile : on bypass Sonner, on déclenche success/error manuellement après
	 * résolution. Le bouton appelant porte déjà l'état pending visible.
	 */
	promise: ((promise: Promise<unknown> | (() => Promise<unknown>), opts) => {
		const origSuccess = opts?.success;
		const origError = opts?.error;

		if (isMobileViewport()) {
			const p = (typeof promise === "function" ? promise() : promise) as Promise<unknown>;
			p.then(
				(data) => {
					const msg =
						typeof origSuccess === "function"
							? (origSuccess as (d: unknown) => unknown)(data)
							: origSuccess;
					if (typeof msg === "string") toast.success(msg);
				},
				(err) => {
					const msg =
						typeof origError === "function"
							? (origError as (e: unknown) => unknown)(err)
							: origError;
					if (typeof msg === "string") toast.error(msg);
				},
			);
			return p as never;
		}

		const wrappedOpts = {
			...opts,
			success: (data: unknown) => {
				triggerHaptic("success");
				const resolved =
					typeof origSuccess === "function"
						? (origSuccess as (d: unknown) => unknown)(data)
						: origSuccess;
				if (typeof resolved === "string") announceToScreenReader(resolved, "polite");
				return resolved as never;
			},
			error: (err: unknown) => {
				triggerHaptic("error");
				const raw =
					typeof origError === "function" ? (origError as (e: unknown) => unknown)(err) : origError;
				const sanitized = typeof raw === "string" ? sanitizeErrorMessage(raw) : raw;
				if (typeof sanitized === "string") announceToScreenReader(sanitized, "assertive");
				return sanitized as never;
			},
		};
		return sonnerToast.promise(promise as never, wrappedOpts as never);
	}) as SonnerToast["promise"],
	custom: ((...args: Parameters<SonnerToast["custom"]>) =>
		sonnerToast.custom(...args)) as SonnerToast["custom"],
};

export { sanitizeErrorMessage, GENERIC_ERROR_MESSAGE, computeDuration };
