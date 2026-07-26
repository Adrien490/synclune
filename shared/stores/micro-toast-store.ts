import { create } from "zustand";
import { devtools } from "zustand/middleware";

/**
 * Store Zustand single-slot pour la pastille mobile (`<MicroToast />`).
 *
 * Pattern : remplace (pas d'empilement). Parité avec `visibleToasts={1}` Sonner
 * mobile, ENRICHI d'un mécanisme de **coalescing** : si la même paire
 * `(message, variant)` est ré-émise dans une fenêtre courte
 * (`COALESCE_WINDOW_MS`), on incrémente un compteur affiché « ×N » au lieu
 * de remplacer (perte d'info sinon — pattern Apple notifications groupées).
 *
 * Le timer auto-dismiss est module-scoped (hors `useEffect`) pour ne pas se
 * réarmer sur chaque re-render de composants consumers.
 *
 * Branché depuis `shared/utils/toast.ts` quand `isMobileViewport()` :
 *   useMicroToastStore.getState().show(message, "success")
 *   useMicroToastStore.getState().show(message, "wishlist") // microVariant
 */

type MicroToastVariant =
	"success" | "info" | "warning" | "error" | "loading" | "wishlist" | "cart" | "discount";

const MAX_MESSAGE_LENGTH = 48;
const DEFAULT_DURATION_MS = 1200;
export const COALESCE_WINDOW_MS = 600;

/**
 * Plafond de sécurité pour la pastille `loading` (départ assumé du design
 * fire-and-forget — câblage mobile de `toast.loading`/`toast.promise`).
 *
 * Une pastille `loading` est **persistante** (pas d'auto-dismiss à `duration`) :
 * elle vit jusqu'à ce qu'un toast terminal la **morphe** (success/error réutilisent
 * le `key` → swap icône/message sans remount) ou qu'un `hide()` explicite la ferme.
 * Ce plafond garantit qu'une pastille orpheline (action sans toast terminal, ex.
 * `showSuccessToast: false` sans message) ne reste jamais bloquée indéfiniment.
 */
export const MICRO_TOAST_LOADING_MAX_MS = 12000;

function truncate(message: string): string {
	if (message.length <= MAX_MESSAGE_LENGTH) return message;
	return `${message.slice(0, MAX_MESSAGE_LENGTH - 1).trimEnd()}…`;
}

/** Action inline optionnelle sur la pastille (undo mobile — F5). */
export interface MicroToastAction {
	label: string;
	onClick: () => void;
}

interface MicroToastState {
	visible: boolean;
	message: string;
	variant: MicroToastVariant;
	key: number;
	/** Nombre d'occurrences agrégées dans la fenêtre `COALESCE_WINDOW_MS`. */
	count: number;
	/** Duration appliquée au timer courant — exposée pour aligner la progress bar. */
	currentDuration: number;
	/** Bouton d'action inline (ex: « Annuler »). `null` = pastille passive (défaut). */
	action: MicroToastAction | null;
	show: (
		message: string,
		variant: MicroToastVariant,
		duration?: number,
		action?: MicroToastAction | null,
	) => void;
	hide: () => void;
}

let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let lastShowAt = 0;
let lastShowSignature = ""; // `${variant}::${truncated message}`

export const useMicroToastStore = create<MicroToastState>()(
	devtools(
		(set, get) => ({
			visible: false,
			message: "",
			variant: "success",
			key: 0,
			count: 1,
			currentDuration: DEFAULT_DURATION_MS,
			action: null,
			show: (message, variant, duration = DEFAULT_DURATION_MS, action = null) => {
				const truncated = truncate(message);
				const signature = `${variant}::${truncated}`;
				const now = Date.now();
				const within = now - lastShowAt < COALESCE_WINDOW_MS;
				const current = get();

				// Error-sticky : une erreur affichée ne doit jamais être enterrée par un
				// success/info/warning (F1 — les erreurs partagent désormais le slot pastille
				// sur mobile). Les erreurs restent prioritaires ; seule une autre erreur peut
				// remplacer une erreur visible.
				if (current.visible && current.variant === "error" && variant !== "error") {
					return;
				}

				// Le loading n'est jamais coalescé (capsule persistante, pas une notif répétée).
				const shouldCoalesce =
					within && current.visible && variant !== "loading" && signature === lastShowSignature;

				// Morph in-place : un toast terminal (success/error/…) qui remplace une
				// pastille `loading` visible réutilise le `key` courant → la même capsule
				// swap icône + message sans exit/enter `AnimatePresence` (pattern Dynamic
				// Island). Sans ça, le changement de `key` re-mount = flicker.
				const morphsFromLoading =
					current.visible && current.variant === "loading" && variant !== "loading";

				if (dismissTimer !== null) clearTimeout(dismissTimer);

				if (shouldCoalesce) {
					set(
						{
							count: current.count + 1,
							currentDuration: duration,
							action,
						},
						false,
						"coalesce",
					);
				} else {
					set(
						{
							visible: true,
							message: truncated,
							variant,
							key: morphsFromLoading ? current.key : now,
							count: 1,
							currentDuration: duration,
							action,
						},
						false,
						morphsFromLoading ? "morph" : "show",
					);
				}

				lastShowAt = now;
				lastShowSignature = signature;

				// Pastille `loading` : persistante (pas d'auto-dismiss à `duration`), bornée
				// par un plafond de sécurité. Tout autre variant garde l'auto-dismiss normal.
				const dismissDelay = variant === "loading" ? MICRO_TOAST_LOADING_MAX_MS : duration;

				dismissTimer = setTimeout(() => {
					set({ visible: false }, false, "auto-hide");
					dismissTimer = null;
				}, dismissDelay);
			},
			hide: () => {
				if (dismissTimer !== null) {
					clearTimeout(dismissTimer);
					dismissTimer = null;
				}
				set({ visible: false }, false, "hide");
			},
		}),
		{ name: "MicroToastStore", enabled: process.env.NODE_ENV === "development" },
	),
);

export { DEFAULT_DURATION_MS as MICRO_TOAST_DURATION_MS };

// Dev-only: expose le store sur window pour diagnostiquer in-situ sur device réel
// (Safari Web Inspector USB → console iPhone → `__microToastStore.getState()`).
if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
	(window as unknown as { __microToastStore?: typeof useMicroToastStore }).__microToastStore =
		useMicroToastStore;
}
