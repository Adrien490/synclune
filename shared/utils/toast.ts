"use client";

import { toast as sonnerToast } from "sonner";

import { triggerHaptic } from "@/shared/hooks/use-haptic";

/**
 * Wrapper toast central pour Synclune — haptics natives + sanitisation d'erreurs.
 *
 * API identique à `sonner` (signature drop-in replacement) avec deux ajouts :
 * 1. Haptic feedback automatique sur success/error/warning (pattern `useHaptic`).
 *    Silencieux sur iOS Safari (Vibration API ignorée), actif sur Android & Chrome
 *    desktop avec device emulator.
 * 2. Sanitisation des messages techniques passés à `error(...)` : si le message
 *    contient un pattern typique d'erreur bas-niveau (stack trace, code Prisma,
 *    "fetch failed", etc.), il est remplacé par un message générique FR. Les
 *    messages FR user-friendly passent inchangés.
 *
 * Usage :
 *   import { toast } from "@/shared/utils/toast";
 *   toast.success("Bijou créé");
 *   toast.error(`Erreur: ${error.message}`); // sanitisé si technique
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

type SonnerToast = typeof sonnerToast;
type ExternalToastOptions = Parameters<SonnerToast["success"]>[1];

export const toast = {
	success: (message: Parameters<SonnerToast["success"]>[0], opts?: ExternalToastOptions) => {
		triggerHaptic("success");
		return opts === undefined ? sonnerToast.success(message) : sonnerToast.success(message, opts);
	},
	error: (message: Parameters<SonnerToast["error"]>[0], opts?: ExternalToastOptions) => {
		triggerHaptic("error");
		const sanitized = typeof message === "string" ? sanitizeErrorMessage(message) : message;
		return opts === undefined ? sonnerToast.error(sanitized) : sonnerToast.error(sanitized, opts);
	},
	warning: (message: Parameters<SonnerToast["warning"]>[0], opts?: ExternalToastOptions) => {
		triggerHaptic("medium");
		return opts === undefined ? sonnerToast.warning(message) : sonnerToast.warning(message, opts);
	},
	info: ((...args: Parameters<SonnerToast["info"]>) =>
		sonnerToast.info(...args)) as SonnerToast["info"],
	message: ((...args: Parameters<SonnerToast["message"]>) =>
		sonnerToast.message(...args)) as SonnerToast["message"],
	loading: ((...args: Parameters<SonnerToast["loading"]>) =>
		sonnerToast.loading(...args)) as SonnerToast["loading"],
	dismiss: ((...args: Parameters<SonnerToast["dismiss"]>) =>
		sonnerToast.dismiss(...args)) as SonnerToast["dismiss"],
	promise: ((...args: Parameters<SonnerToast["promise"]>) =>
		sonnerToast.promise(...args)) as SonnerToast["promise"],
	custom: ((...args: Parameters<SonnerToast["custom"]>) =>
		sonnerToast.custom(...args)) as SonnerToast["custom"],
};

export { sanitizeErrorMessage, GENERIC_ERROR_MESSAGE };
