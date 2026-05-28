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

export type MicroToastVariant =
	| "success"
	| "info"
	| "warning"
	| "error"
	| "wishlist"
	| "cart"
	| "discount";

const MAX_MESSAGE_LENGTH = 48;
const DEFAULT_DURATION_MS = 1200;
export const COALESCE_WINDOW_MS = 600;

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

				const shouldCoalesce = within && current.visible && signature === lastShowSignature;

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
							key: now,
							count: 1,
							currentDuration: duration,
							action,
						},
						false,
						"show",
					);
				}

				lastShowAt = now;
				lastShowSignature = signature;

				dismissTimer = setTimeout(() => {
					set({ visible: false }, false, "auto-hide");
					dismissTimer = null;
				}, duration);
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
