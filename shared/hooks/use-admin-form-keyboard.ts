"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { useHaptic } from "@/shared/hooks/use-haptic";
import { withViewTransition } from "@/shared/utils/with-view-transition";

interface UseAdminFormKeyboardOptions {
	/** Ref vers le `<form>` à soumettre via ⌘S/Ctrl+S. */
	formRef: React.RefObject<HTMLFormElement | null>;
	/** Désactive les raccourcis pendant la soumission. */
	isPending: boolean;
	/** Sur mobile, les raccourcis clavier sont désactivés. */
	isMobile: boolean;
	/** Route de la liste à atteindre via Échap. */
	listPath: string;
	/** Libère la garde `useUnsavedChanges` avant la navigation Échap. */
	allowNavigation: () => void;
	/** Lecture live de l'état dirty (pour la confirmation Échap). */
	getIsDirty: () => boolean;
	/**
	 * Lecture live de `canSubmit`. Si fournie, ⌘S ne soumet que si le form est
	 * valide. Omettre pour laisser le handler submit gérer la validation.
	 */
	getCanSubmit?: () => boolean;
}

/**
 * Raccourcis clavier desktop partagés par les formulaires admin :
 * - ⌘S / Ctrl+S : soumet le formulaire (haptic medium).
 * - Échap : retourne à la liste (confirm si modifications non enregistrées),
 *   sans interférer avec un dialog/sheet/popover ouvert au premier plan.
 *
 * Extrait de create/edit color & material forms (DRY). Lit l'état mutable via
 * une ref mise à jour à chaque render pour garder des dépendances d'effet
 * stables (pas de re-attachement des listeners à chaque frappe).
 */
export function useAdminFormKeyboard({
	formRef,
	isPending,
	isMobile,
	listPath,
	allowNavigation,
	getIsDirty,
	getCanSubmit,
}: UseAdminFormKeyboardOptions) {
	const router = useRouter();
	const haptic = useHaptic();

	const liveRef = useRef({ allowNavigation, getIsDirty, getCanSubmit });
	useEffect(() => {
		liveRef.current = { allowNavigation, getIsDirty, getCanSubmit };
	});

	// ⌘S / Ctrl+S → submit
	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
			if (!isSaveShortcut) return;
			event.preventDefault();
			if (isPending) return;
			if (liveRef.current.getCanSubmit && !liveRef.current.getCanSubmit()) return;
			haptic("medium");
			formRef.current?.requestSubmit();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, formRef, haptic]);

	// Échap → retour liste (confirm si dirty)
	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || isPending) return;
			const target = event.target as HTMLElement | null;
			if (
				target?.closest(
					"[data-slot='dialog-content'],[data-slot='sheet-content'],[data-slot='popover-content'],[role='dialog']",
				)
			) {
				return;
			}
			if (
				liveRef.current.getIsDirty() &&
				!window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")
			) {
				return;
			}
			event.preventDefault();
			haptic("light");
			liveRef.current.allowNavigation();
			withViewTransition(() => router.push(listPath));
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, haptic, router, listPath]);
}
