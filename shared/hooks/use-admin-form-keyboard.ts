"use client";

import { useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";

import { useNavigationGuardOptional } from "@/shared/contexts/navigation-guard-context";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { withViewTransition } from "@/shared/utils/view-transition";

/**
 * Overlays qui consomment déjà Échap : le raccourci « retour à la liste » doit les
 * ignorer, sinon fermer un Select ou un menu déclenche aussi le `confirm` des
 * modifications non enregistrées PUIS la navigation. `select-content` et
 * `dropdown-menu-content` manquaient — un Select dans un formulaire admin (type de
 * remise, transporteur, pays…) faisait donc quitter la page.
 *
 * SSOT : à étendre ici, jamais recopiée dans un formulaire.
 */
const OVERLAY_PARTS = [
	"[data-slot='dialog-content']",
	"[data-slot='sheet-content']",
	"[data-slot='drawer-content']",
	"[data-slot='alert-dialog-content']",
	"[data-slot='popover-content']",
	"[data-slot='select-content']",
	"[data-slot='dropdown-menu-content']",
	"[role='dialog']",
	// Radix rend `role="alertdialog"`, PAS `role="dialog"` : sans cette entrée,
	// Échap sur une confirmation ouverte au-dessus d'un formulaire admin fermait
	// la confirmation ET quittait la page. Cas le plus atteignable : formulaire
	// dirty → Échap → `UnsavedChangesDialog` → Échap → Radix ferme pendant que ce
	// raccourci redemande la navigation, qui la rouvre aussitôt.
	"[role='alertdialog']",
] as const;

export const OVERLAY_SELECTOR = OVERLAY_PARTS.join(",");

/**
 * Même liste, restreinte aux overlays effectivement ouverts.
 *
 * Radix et Vaul portent tous deux `data-state="open"|"closed"` sur leur
 * `Content` ; la contrainte est indispensable ici, sinon n'importe quel nœud
 * portant un `data-slot` d'overlay (y compris un harnais de test ou un contenu
 * en cours d'animation de sortie) désarmerait le raccourci en permanence.
 */
const OPEN_OVERLAY_SELECTOR = OVERLAY_PARTS.map((part) => `${part}[data-state='open']`).join(",");

/**
 * Un overlay est-il ouvert quelque part dans le document ?
 *
 * Repli du test `event.target.closest(OVERLAY_SELECTOR)`, qui échoue dès que le
 * focus n'est pas DANS l'overlay — typiquement quand il est resté sur `<body>`
 * (overlay sans élément focusable, focus perdu après une action). Le raccourci
 * « retour à la liste » se déclenchait alors par-dessus l'overlay ouvert.
 */
function hasOpenOverlay(): boolean {
	return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}

interface UseAdminFormKeyboardOptions {
	/** Ref vers le `<form>` à soumettre via ⌘S/Ctrl+S. */
	formRef: React.RefObject<HTMLFormElement | null>;
	/** Désactive les raccourcis pendant la soumission. */
	isPending: boolean;
	/** Sur mobile, les raccourcis clavier sont désactivés. */
	isMobile: boolean;
	/**
	 * Route atteinte par Échap. Omettre (ou passer `undefined`) désactive le
	 * raccourci — cas des formulaires en dialog, où Échap ferme la modale.
	 */
	listPath?: string;
	/** Libère la garde `useUnsavedChanges` avant la navigation Échap. */
	allowNavigation: () => void;
	/** Lecture live de l'état dirty (pour la confirmation Échap). */
	getIsDirty: () => boolean;
	/**
	 * Lecture live de `canSubmit`. Si fournie, ⌘S ne soumet que si le form est
	 * valide. Omettre pour laisser le handler submit gérer la validation.
	 */
	getCanSubmit?: () => boolean;
	/**
	 * Occupation supplémentaire bloquant ⌘S (téléversement média en vol…). Distinct
	 * de `isPending`, qui ne couvre que la Server Action.
	 */
	extraBusy?: boolean;
}

/**
 * Raccourcis clavier desktop partagés par les formulaires admin :
 * - ⌘S / Ctrl+S : soumet le formulaire (haptic medium).
 * - Échap : retourne à la liste, sans interférer avec un dialog/sheet/popover
 *   ouvert au premier plan. Si le formulaire est dirty, passe par
 *   `requestNavigation` pour ouvrir l'`UnsavedChangesDialog` stylé (même UX que
 *   le chevron retour et la sidebar) plutôt qu'un `window.confirm` natif.
 *
 * Extrait de create/edit color & material forms (DRY). Le corps des deux
 * raccourcis vit dans des `useEffectEvent` : l'état mutable (`isPending`,
 * `extraBusy`, callbacks de l'appelant) y est LU sans entrer dans les
 * dépendances, donc les listeners `window` ne sont jamais rattachés après le
 * montage. @regression admin-form-shortcut-listener-churn
 */
export function useAdminFormKeyboard({
	formRef,
	isPending,
	isMobile,
	listPath,
	allowNavigation,
	getIsDirty,
	getCanSubmit,
	extraBusy = false,
}: UseAdminFormKeyboardOptions) {
	const router = useRouter();
	const haptic = useHaptic();
	const navigationGuard = useNavigationGuardOptional();

	const onSaveShortcut = useEffectEvent(() => {
		if (isPending || extraBusy) return;
		if (getCanSubmit && !getCanSubmit()) return;
		haptic("medium");
		formRef.current?.requestSubmit();
	});

	// ⌘S / Ctrl+S → submit
	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
			if (!isSaveShortcut) return;
			// ⚠️ `preventDefault` reste ICI, AVANT la garde `isPending`/`extraBusy` :
			// ⌘S doit neutraliser la boîte « Enregistrer » du navigateur même pendant
			// une soumission. Le déplacer dans l'effect event le rendrait conditionnel.
			event.preventDefault();
			onSaveShortcut();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile]);

	const onEscape = useEffectEvent((event: KeyboardEvent) => {
		// `listPath` est déjà garanti par l'effet — sans lui aucun listener n'existe.
		// Le re-tester ne sert qu'à le narrower pour TypeScript.
		if (isPending || !listPath) return;
		const target = event.target as HTMLElement | null;
		const isInsideOverlay = target?.closest(OVERLAY_SELECTOR) != null;
		if (isInsideOverlay || hasOpenOverlay()) {
			return;
		}
		event.preventDefault();

		const navigate = () => {
			haptic("light");
			allowNavigation();
			withViewTransition(() => router.push(listPath));
		};

		if (!navigationGuard) {
			// Hors NavigationGuardProvider : repli sur la confirmation native.
			if (
				getIsDirty() &&
				!window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")
			) {
				return;
			}
			navigate();
			return;
		}

		// Guard actif (formulaire dirty) → `requestNavigation` renvoie false et
		// ouvre le dialogue, qui rappellera `navigate` via `proceed`.
		if (navigationGuard.requestNavigation(listPath, navigate)) {
			navigate();
		}
	});

	// Échap → retour liste (confirm si dirty)
	useEffect(() => {
		if (isMobile || !listPath) return;
		const handler = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			onEscape(event);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, listPath]);
}
