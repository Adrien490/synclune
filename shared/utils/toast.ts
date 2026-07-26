"use client";

import { toast as sonnerToast } from "sonner";

import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { MOBILE_BREAKPOINT } from "@/shared/hooks/use-mobile";
import {
	COALESCE_WINDOW_MS,
	type MicroToastAction,
	useMicroToastStore,
} from "@/shared/stores/micro-toast-store";

/**
 * Wrapper toast central pour Synclune — haptics natives + sanitisation d'erreurs
 * + annonce screen-reader + duration adaptative à la densité lexicale.
 *
 * API identique à `sonner` (drop-in replacement) avec cinq ajouts :
 * 1. Haptic feedback automatique sur success/error/warning (pattern `useHaptic`).
 *    Silencieux sur iOS Safari (Vibration API ignorée), actif sur Android & PWA.
 * 2. Sanitisation des messages techniques passés à `error(...)` : si le message
 *    contient un pattern typique d'erreur bas-niveau (stack trace, code Prisma,
 *    "fetch failed", etc.), il est remplacé par un message générique FR.
 * 3. Annonce screen-reader via région `aria-live` (WCAG 4.1.3 Status Messages).
 *    Les régions DOM sont montées par `<AppToaster />` — cf toaster.tsx.
 * 4. Duration adaptative (WPS-based) : messages longs restent plus longtemps,
 *    erreurs persistent au moins 5s (parité iOS Live Activities).
 * 5. Mobile (≤767px) : `success/info/warning/error` routent tous vers
 *    `<MicroToast />` pastille top-center (feedback unifié, F1). `error` y persiste
 *    5s+ (computeDuration) et reste "sticky" : un success ne peut pas l'enterrer
 *    (cf micro-toast-store). Un `opts.action` passé en mode mobile est propagé à
 *    la pastille (bouton inline, F5).
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
 * Détecte un viewport mobile (< `MOBILE_BREAKPOINT`) — aligné sur le hook
 * `useIsMobile`. Sur mobile, l'état pending des boutons (spinner + label)
 * suffit ; un toast loading consommerait l'unique slot visible
 * (`visibleToasts: 1`) et masquerait du contenu.
 *
 * Exporté pour les utilities qui doivent bifurquer leur logique mobile/desktop
 * hors du wrapper (ex: `show-wishlist-undo-toast.ts` qui retire la description
 * et l'action sur mobile car MicroToast est passive).
 */
export function isMobileViewport(): boolean {
	if (typeof window === "undefined") return false;
	if (typeof window.matchMedia !== "function") return false;
	return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
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
 * Dédup desktop (F4) — parité avec le coalescing ×N de la pastille mobile.
 * Sans ça, Sonner empile jusqu'à 3 toasts identiques sur actions répétées rapides.
 * On dérive un `id` stable depuis `(variant, message)` : Sonner rafraîchit le toast
 * existant au lieu d'empiler, et on suffixe ` ×N` au message dans la fenêtre.
 * Non appliqué quand l'appelant fournit un `id` explicite ou une `action` (chaque
 * undo cible un état distinct).
 */
const desktopCoalesce = new Map<string, { count: number; lastAt: number }>();

function coalesceDesktop(variant: string, message: string): { id: string; displayMessage: string } {
	const now = Date.now();
	// Éviction des entrées expirées (borne la taille du Map).
	for (const [k, v] of desktopCoalesce) {
		if (now - v.lastAt >= COALESCE_WINDOW_MS) desktopCoalesce.delete(k);
	}
	const key = `${variant}::${message}`;
	const prev = desktopCoalesce.get(key);
	const count = prev && now - prev.lastAt < COALESCE_WINDOW_MS ? prev.count + 1 : 1;
	desktopCoalesce.set(key, { count, lastAt: now });
	return {
		id: `coalesce:${key}`,
		displayMessage: count > 1 ? `${message} ×${count}` : message,
	};
}

/** Reset interne (tests uniquement) — vide le cache de dédup desktop. */
function __resetDesktopCoalesce(): void {
	desktopCoalesce.clear();
}

type SonnerToast = typeof sonnerToast;
type ExternalToastOptions = Parameters<SonnerToast["success"]>[1];

/**
 * Variant bijou Synclune utilisée uniquement par `<MicroToast />` mobile.
 * Override la variant générique (success/info/warning) côté pastille mobile
 * pour afficher une icône métier dédiée (cœur, sac, étiquette %).
 * Ignoré sur desktop : Sonner garde l'icône success/info/warning classique.
 */
type MicroVariantOverride = "wishlist" | "cart" | "discount";

type ExternalToastOptionsWithMicroVariant = ExternalToastOptions & {
	microVariant?: MicroVariantOverride;
};

/** Durée minimale quand la pastille porte une action inline (laisser le temps de cliquer). */
const ACTION_MIN_DURATION_MS = 6000;

/**
 * Référence sentinelle retournée par `toast.loading()` sur mobile (la pastille
 * `<MicroToast />` est single-slot, pas d'id Sonner). Doit rester **truthy** :
 * `withCallbacks` (`shared/utils/with-callbacks.ts`) n'appelle `onEnd` que si
 * `onStart` a renvoyé une valeur truthy. `toast.dismiss(MICRO_LOADING_REF)` est
 * alors un **no-op** : le toast terminal (success/error) morphe la pastille en
 * place (cf. store `morph`), et le plafond de sécurité couvre le cas sans terminal.
 */
const MICRO_LOADING_REF = "__synclune_micro_loading__";

/**
 * Convertit une `action` Sonner ({ label, onClick }) en `MicroToastAction` pour la
 * pastille mobile (F5). Retourne `null` si l'action n'est pas exploitable côté pastille
 * (ReactNode custom, label non-string) — on reste alors fire-and-forget.
 */
function toMicroAction(
	action: NonNullable<ExternalToastOptions>["action"],
): MicroToastAction | null {
	if (!action || typeof action !== "object") return null;
	const candidate = action as { label?: unknown; onClick?: unknown };
	if (typeof candidate.label !== "string" || typeof candidate.onClick !== "function") return null;
	const onClick = candidate.onClick as (event: unknown) => void;
	return { label: candidate.label, onClick: () => onClick(undefined) };
}

/** Durée pastille : floor par type, étendue à `ACTION_MIN_DURATION_MS` si action présente. */
function microDuration(
	message: string,
	type: keyof typeof MIN_DURATION,
	hasAction: boolean,
): number {
	const base = computeDuration(message, type);
	return hasAction ? Math.max(base, ACTION_MIN_DURATION_MS) : base;
}

export const toast = {
	success: (
		message: Parameters<SonnerToast["success"]>[0],
		opts?: ExternalToastOptionsWithMicroVariant,
	) => {
		announceToScreenReader(message, "polite");
		if (isMobileViewport()) {
			triggerHaptic("light");
			if (typeof message === "string") {
				const action = toMicroAction(opts?.action);
				const duration = opts?.duration ?? microDuration(message, "success", action !== null);
				useMicroToastStore
					.getState()
					.show(message, opts?.microVariant ?? "success", duration, action);
			}
			return undefined as never;
		}
		triggerHaptic("success");
		const duration = opts?.duration ?? computeDuration(message, "success");
		const { microVariant: _ignored, ...sonnerOpts } = opts ?? {};
		const dedup =
			typeof message === "string" && sonnerOpts.id === undefined && sonnerOpts.action === undefined
				? coalesceDesktop("success", message)
				: null;
		const id = sonnerToast.success(dedup?.displayMessage ?? message, {
			...sonnerOpts,
			...(dedup ? { id: dedup.id } : {}),
			duration,
		});
		lastNonErrorToastId = id;
		return id;
	},
	error: (message: Parameters<SonnerToast["error"]>[0], opts?: ExternalToastOptions) => {
		triggerHaptic("error");
		const sanitized = typeof message === "string" ? sanitizeErrorMessage(message) : message;
		announceToScreenReader(sanitized, "assertive");
		if (isMobileViewport()) {
			// F1 : les erreurs partagent le slot pastille top-center (feedback unifié
			// mobile). La pastille remplace toujours un success/warning visible (variant
			// différente → pas de coalesce) et reste "sticky" (cf micro-toast-store).
			if (typeof sanitized === "string") {
				const action = toMicroAction(opts?.action);
				const duration = opts?.duration ?? microDuration(sanitized, "error", action !== null);
				useMicroToastStore.getState().show(sanitized, "error", duration, action);
			}
			return undefined as never;
		}
		clearPendingNonError();
		const duration = opts?.duration ?? computeDuration(sanitized, "error");
		const dedup =
			typeof sanitized === "string" && opts?.id === undefined && opts?.action === undefined
				? coalesceDesktop("error", sanitized)
				: null;
		return sonnerToast.error(dedup?.displayMessage ?? sanitized, {
			...opts,
			...(dedup ? { id: dedup.id } : {}),
			duration,
		});
	},
	warning: (
		message: Parameters<SonnerToast["warning"]>[0],
		opts?: ExternalToastOptionsWithMicroVariant,
	) => {
		announceToScreenReader(message, "polite");
		if (isMobileViewport()) {
			triggerHaptic("medium");
			if (typeof message === "string") {
				const action = toMicroAction(opts?.action);
				const duration = opts?.duration ?? microDuration(message, "warning", action !== null);
				useMicroToastStore
					.getState()
					.show(message, opts?.microVariant ?? "warning", duration, action);
			}
			return undefined as never;
		}
		triggerHaptic("medium");
		const duration = opts?.duration ?? computeDuration(message, "warning");
		const { microVariant: _ignored, ...sonnerOpts } = opts ?? {};
		const dedup =
			typeof message === "string" && sonnerOpts.id === undefined && sonnerOpts.action === undefined
				? coalesceDesktop("warning", message)
				: null;
		const id = sonnerToast.warning(dedup?.displayMessage ?? message, {
			...sonnerOpts,
			...(dedup ? { id: dedup.id } : {}),
			duration,
		});
		lastNonErrorToastId = id;
		return id;
	},
	info: ((
		message: Parameters<SonnerToast["info"]>[0],
		opts?: ExternalToastOptionsWithMicroVariant,
	) => {
		announceToScreenReader(message, "polite");
		if (isMobileViewport()) {
			if (typeof message === "string") {
				const action = toMicroAction(opts?.action);
				const duration = opts?.duration ?? microDuration(message, "info", action !== null);
				useMicroToastStore.getState().show(message, opts?.microVariant ?? "info", duration, action);
			}
			return undefined as never;
		}
		const duration = opts?.duration ?? computeDuration(message, "info");
		const { microVariant: _ignored, ...sonnerOpts } = opts ?? {};
		const dedup =
			typeof message === "string" && sonnerOpts.id === undefined && sonnerOpts.action === undefined
				? coalesceDesktop("info", message)
				: null;
		const id = sonnerToast.info(dedup?.displayMessage ?? message, {
			...sonnerOpts,
			...(dedup ? { id: dedup.id } : {}),
			duration,
		});
		lastNonErrorToastId = id;
		return id;
	}) as SonnerToast["info"],
	message: ((...args: Parameters<SonnerToast["message"]>) =>
		sonnerToast.message(...args)) as SonnerToast["message"],
	loading: ((...args: Parameters<SonnerToast["loading"]>) => {
		// Mobile : pastille loader top-center persistante (morphe en success/error via
		// le toast terminal). Sur desktop, Sonner garde son spinner natif.
		if (isMobileViewport()) {
			const [message] = args;
			if (typeof message === "string") {
				useMicroToastStore.getState().show(message, "loading");
			}
			return MICRO_LOADING_REF as never;
		}
		return sonnerToast.loading(...args);
	}) as SonnerToast["loading"],
	dismiss: ((...args: Parameters<SonnerToast["dismiss"]>) => {
		// La pastille loading mobile n'est PAS fermée par dismiss : `onEnd(dismiss)`
		// s'exécute AVANT `onSuccess(show)` dans withCallbacks, donc un hide() ici
		// provoquerait un flicker. On laisse le toast terminal morpher la capsule
		// (ou le plafond de sécurité la fermer si aucun terminal ne suit).
		if (args[0] === MICRO_LOADING_REF) return undefined as never;
		return sonnerToast.dismiss(...args);
	}) as SonnerToast["dismiss"],
	/**
	 * `toast.promise(promise, { loading, success, error })` morph le toast
	 * loading → success/error sans unmount/mount (pattern Dynamic Island iOS 18).
	 * Le wrapper ajoute : haptic success/error, sanitize error, sr-only announce.
	 *
	 * Mobile : pastille loader top-center pendant la promesse, puis morph en
	 * success/error (le toast terminal réutilise le slot via le store). Si aucun
	 * message terminal n'est fourni, on ferme la pastille (`hide`) au settle.
	 */
	promise: ((promise: Promise<unknown> | (() => Promise<unknown>), opts) => {
		const origSuccess = opts?.success;
		const origError = opts?.error;

		if (isMobileViewport()) {
			const loadingMessage = opts?.loading;
			if (typeof loadingMessage === "string") {
				useMicroToastStore.getState().show(loadingMessage, "loading");
			}
			const p = (typeof promise === "function" ? promise() : promise) as Promise<unknown>;
			p.then(
				(data) => {
					const msg =
						typeof origSuccess === "function"
							? (origSuccess as (d: unknown) => unknown)(data)
							: origSuccess;
					if (typeof msg === "string") toast.success(msg);
					else useMicroToastStore.getState().hide();
				},
				(err) => {
					const msg =
						typeof origError === "function"
							? (origError as (e: unknown) => unknown)(err)
							: origError;
					if (typeof msg === "string") toast.error(msg);
					else useMicroToastStore.getState().hide();
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

export { sanitizeErrorMessage, GENERIC_ERROR_MESSAGE, computeDuration, __resetDesktopCoalesce };
