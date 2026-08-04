"use client";

import { toast as sonnerToast } from "sonner";

import { GENERIC_ERROR_MESSAGE } from "@/shared/constants/error-messages";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { MOBILE_MEDIA_QUERY } from "@/shared/hooks/use-mobile";
import { announce } from "@/shared/utils/announce";

/**
 * Wrapper toast central pour Synclune — haptics natives + sanitisation d'erreurs
 * + annonce screen-reader + duration adaptative à la densité lexicale.
 *
 * API identique à `sonner` (drop-in replacement) avec quatre ajouts :
 * 1. Haptic feedback automatique sur success/error/warning (pattern `useHaptic`),
 *    uniquement sur viewport mobile — un toast est un AFFICHAGE, et vibrer sur
 *    une entrée souris/clavier serait un retour tactile sans geste tactile.
 *    Silencieux sur iOS Safari (Vibration API ignorée), actif sur Android & PWA.
 * 2. Sanitisation des messages techniques passés à `error(...)` : si le message
 *    contient un pattern typique d'erreur bas-niveau (stack trace, code Prisma,
 *    "fetch failed", etc.), il est remplacé par un message générique FR.
 * 3. Annonce screen-reader via région `aria-live` (WCAG 4.1.3 Status Messages).
 *    Les régions DOM sont montées par `<AppToaster />` — cf toaster.tsx.
 * 4. Duration adaptative (WPS-based) : messages longs restent plus longtemps,
 *    erreurs persistent au moins 5s (parité iOS Live Activities).
 *
 * Un seul rendu, mobile comme desktop : Sonner (`<AppToaster />` adapte position,
 * gestes et `visibleToasts` au viewport).
 */

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
 * Annonce sr-only du toast — Sonner 2.0 n'expose pas `aria-live` sur son
 * conteneur (audit WCAG 4.1.3 échoué par défaut), on double-passe par les
 * régions globales de `AppToaster`.
 *
 * L'implémentation vit dans `shared/utils/announce.ts` : le canal n'a rien de
 * spécifique aux toasts et sert aussi les annonces non-toast (ajout au panier,
 * passage à l'état vide des favoris).
 */
const announceToScreenReader = announce;

/**
 * Détecte un viewport mobile (< `48rem`) — aligné sur le hook `useIsMobile`.
 *
 * Deux usages : gate de l'haptique (le doigt, pas la souris) et bifurcation de
 * copy côté appelants qui doivent alléger un toast sur petit écran
 * (ex: `show-wishlist-undo-toast.ts`).
 */
export function isMobileViewport(): boolean {
	if (typeof window === "undefined") return false;
	if (typeof window.matchMedia !== "function") return false;
	return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
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

/**
 * Dédup (F4) — sans elle, Sonner empile jusqu'à 3 toasts identiques sur actions
 * répétées rapides. On dérive un `id` stable depuis `(variant, message)` : Sonner
 * rafraîchit le toast existant au lieu d'empiler, et on suffixe ` ×N` au message
 * dans la fenêtre. Non appliqué quand l'appelant fournit un `id` explicite ou une
 * `action` (chaque undo cible un état distinct).
 */
const COALESCE_WINDOW_MS = 600;

const coalesceCache = new Map<string, { count: number; lastAt: number }>();

function coalesce(variant: string, message: string): { id: string; displayMessage: string } {
	const now = Date.now();
	// Éviction des entrées expirées (borne la taille du Map).
	for (const [k, v] of coalesceCache) {
		if (now - v.lastAt >= COALESCE_WINDOW_MS) coalesceCache.delete(k);
	}
	const key = `${variant}::${message}`;
	const prev = coalesceCache.get(key);
	const count = prev && now - prev.lastAt < COALESCE_WINDOW_MS ? prev.count + 1 : 1;
	coalesceCache.set(key, { count, lastAt: now });
	return {
		id: `coalesce:${key}`,
		displayMessage: count > 1 ? `${message} ×${count}` : message,
	};
}

/** Reset interne (tests uniquement) — vide le cache de dédup. */
function __resetToastCoalesce(): void {
	coalesceCache.clear();
}

type SonnerToast = typeof sonnerToast;
type ExternalToastOptions = Parameters<SonnerToast["success"]>[1];

/** Dédup applicable seulement si l'appelant n'a fourni ni `id` ni `action`. */
function maybeCoalesce(
	variant: string,
	message: unknown,
	opts: ExternalToastOptions,
): { id: string; displayMessage: string } | null {
	if (typeof message !== "string") return null;
	if (opts?.id !== undefined || opts?.action !== undefined) return null;
	return coalesce(variant, message);
}

export const toast = {
	success: (message: Parameters<SonnerToast["success"]>[0], opts?: ExternalToastOptions) => {
		announceToScreenReader(message, "polite");
		if (isMobileViewport()) triggerHaptic("light");
		const duration = opts?.duration ?? computeDuration(message, "success");
		const dedup = maybeCoalesce("success", message, opts);
		const id = sonnerToast.success(dedup?.displayMessage ?? message, {
			...opts,
			...(dedup ? { id: dedup.id } : {}),
			duration,
		});
		lastNonErrorToastId = id;
		return id;
	},
	error: (message: Parameters<SonnerToast["error"]>[0], opts?: ExternalToastOptions) => {
		const sanitized = typeof message === "string" ? sanitizeErrorMessage(message) : message;
		announceToScreenReader(sanitized, "assertive");
		if (isMobileViewport()) triggerHaptic("error");
		clearPendingNonError();
		const duration = opts?.duration ?? computeDuration(sanitized, "error");
		const dedup = maybeCoalesce("error", sanitized, opts);
		return sonnerToast.error(dedup?.displayMessage ?? sanitized, {
			...opts,
			...(dedup ? { id: dedup.id } : {}),
			duration,
		});
	},
	warning: (message: Parameters<SonnerToast["warning"]>[0], opts?: ExternalToastOptions) => {
		announceToScreenReader(message, "polite");
		if (isMobileViewport()) triggerHaptic("medium");
		const duration = opts?.duration ?? computeDuration(message, "warning");
		const dedup = maybeCoalesce("warning", message, opts);
		const id = sonnerToast.warning(dedup?.displayMessage ?? message, {
			...opts,
			...(dedup ? { id: dedup.id } : {}),
			duration,
		});
		lastNonErrorToastId = id;
		return id;
	},
	info: ((message: Parameters<SonnerToast["info"]>[0], opts?: ExternalToastOptions) => {
		announceToScreenReader(message, "polite");
		const duration = opts?.duration ?? computeDuration(message, "info");
		const dedup = maybeCoalesce("info", message, opts);
		const id = sonnerToast.info(dedup?.displayMessage ?? message, {
			...opts,
			...(dedup ? { id: dedup.id } : {}),
			duration,
		});
		lastNonErrorToastId = id;
		return id;
	}) as SonnerToast["info"],
	message: ((...args: Parameters<SonnerToast["message"]>) => {
		announceToScreenReader(args[0], "polite");
		return sonnerToast.message(...args);
	}) as SonnerToast["message"],
	/**
	 * Annoncé en `polite` : c'est le canal de `createToastCallbacks({ loadingMessage })`,
	 * soit une vingtaine d'actions admin (« Création du produit… », « Ajustement du
	 * stock… »). Sans annonce, un lecteur d'écran n'avait aucun signal que la
	 * mutation était partie — le seul retour était le toast visuel.
	 */
	loading: ((...args: Parameters<SonnerToast["loading"]>) => {
		announceToScreenReader(args[0], "polite");
		return sonnerToast.loading(...args);
	}) as SonnerToast["loading"],
	dismiss: ((...args: Parameters<SonnerToast["dismiss"]>) =>
		sonnerToast.dismiss(...args)) as SonnerToast["dismiss"],
	/**
	 * `toast.promise(promise, { loading, success, error })` morph le toast
	 * loading → success/error sans unmount/mount. Le wrapper ajoute : sanitize
	 * error + annonce sr-only. Pas d'haptique ici — les callbacks Sonner ne
	 * passent pas par `toast.success`/`toast.error`.
	 */
	promise: ((promise: Promise<unknown> | (() => Promise<unknown>), opts) => {
		const origSuccess = opts?.success;
		const origError = opts?.error;

		const wrappedOpts = {
			...opts,
			success: (data: unknown) => {
				const resolved =
					typeof origSuccess === "function"
						? (origSuccess as (d: unknown) => unknown)(data)
						: origSuccess;
				if (typeof resolved === "string") announceToScreenReader(resolved, "polite");
				return resolved as never;
			},
			error: (err: unknown) => {
				const raw =
					typeof origError === "function" ? (origError as (e: unknown) => unknown)(err) : origError;
				const sanitized = typeof raw === "string" ? sanitizeErrorMessage(raw) : raw;
				if (typeof sanitized === "string") announceToScreenReader(sanitized, "assertive");
				return sanitized as never;
			},
		};
		return sonnerToast.promise(promise as never, wrappedOpts as never);
	}) as SonnerToast["promise"],
	/**
	 * Pas d'annonce sr-only ici, contrairement aux autres variantes : `custom`
	 * reçoit une fonction de rendu ReactNode, dont on ne peut pas extraire de
	 * texte fiable. Un appelant qui a besoin d'être annoncé doit appeler
	 * `announce()` (`shared/utils/announce.ts`) lui-même.
	 */
	custom: ((...args: Parameters<SonnerToast["custom"]>) =>
		sonnerToast.custom(...args)) as SonnerToast["custom"],
};

export { sanitizeErrorMessage, GENERIC_ERROR_MESSAGE, computeDuration, __resetToastCoalesce };
