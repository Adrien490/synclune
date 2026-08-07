"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Kbd, KbdGroup } from "@/shared/components/ui/kbd";
import { useDialog } from "@/shared/providers/overlay-store-provider";
import { isInteractiveTarget } from "@/shared/utils/is-interactive-target";
import { useEffect } from "react";
import { KEYBOARD_SHORTCUTS_DIALOG_ID } from "./keyboard-shortcuts.constants";

interface ShortcutEntry {
	keys: ReadonlyArray<string>;
	label: string;
}

interface ShortcutGroup {
	title: string;
	items: ReadonlyArray<ShortcutEntry>;
}

/**
 * Inventaire des raccourcis réellement enregistrés. Chaque entrée doit correspondre
 * à un listener existant — et réciproquement : ⌘K et ⌘⏎ existaient sans être
 * documentés ici, donc introuvables autrement qu'en lisant le code.
 *
 * Sites d'enregistrement :
 *  - ⌘B  → `shared/components/ui/sidebar.tsx`
 *  - ?   → ce fichier
 *  - ⌥←/⌥→ → `shared/components/cursor-pagination/cursor-pagination.tsx`
 *  - ⌘S / Echap → `shared/hooks/use-admin-form-keyboard.ts`
 *  - ⌘K  → `modules/products/components/quick-search-dialog/quick-search-keyboard-shortcut.tsx`
 *  - ⌘⏎  → `shared/components/filter-sheet-wrapper.tsx`
 */
const SHORTCUT_GROUPS: ReadonlyArray<ShortcutGroup> = [
	{
		title: "Navigation",
		items: [
			{ keys: ["⌘", "B"], label: "Réduire / déployer la barre latérale" },
			{ keys: ["?"], label: "Afficher cette aide" },
			{ keys: ["Echap"], label: "Fermer le dialogue ou le menu actif" },
		],
	},
	{
		title: "Listes & pagination",
		items: [
			{ keys: ["⌥", "←"], label: "Page précédente" },
			{ keys: ["⌥", "→"], label: "Page suivante" },
			{ keys: ["⌘", "⏎"], label: "Appliquer les filtres (feuille de filtres ouverte)" },
		],
	},
	{
		title: "Formulaires",
		items: [
			// Le hook `useAdminFormKeyboard` est générique (produits, couleurs,
			// matériaux, remises…) — l'intitulé « produit » le sous-vendait.
			{ keys: ["⌘", "S"], label: "Enregistrer le formulaire courant" },
			{ keys: ["Echap"], label: "Annuler la saisie en cours" },
		],
	},
	{
		title: "Recherche",
		items: [
			// Pas de ⌘K ici : `QuickSearchDialogAsync` n'est monté que dans
			// `app/(shop)/layout.tsx`. Le raccourci annoncé n'avait aucun listener sous
			// /admin — fossile du retrait d'`AdminQuickSearchDialog`. On ne monte pas le
			// dialog boutique en admin (il précharge collections + types de la BOUTIQUE
			// à chaque page et renvoie vers /produits), et on garde ⌘K libre pour une
			// éventuelle palette de commandes admin. Audit recherche 2026-07-26.
			{
				keys: [],
				label: "Recherche dans une liste admin : bouton dédié de la barre d'actions",
			},
		],
	},
];

/**
 * Aide raccourcis clavier admin.
 *
 * Écoute `?` (Shift+/) globalement sur /admin pour ouvrir la cheatsheet.
 * Skip les inputs/textareas/contenteditable pour ne pas intercepter la saisie.
 */
export function KeyboardShortcutsDialog() {
	const { isOpen, open, close } = useDialog(KEYBOARD_SHORTCUTS_DIALOG_ID);

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key !== "?" || event.metaKey || event.ctrlKey || event.altKey) return;
			if (isInteractiveTarget(event.target)) return;
			event.preventDefault();
			open();
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open]);

	return (
		<Dialog open={isOpen} onOpenChange={(next) => (next ? open() : close())}>
			<DialogContent className="max-h-[90vh] max-w-lg gap-4 overflow-y-auto p-6">
				<DialogHeader>
					<DialogTitle>Raccourcis clavier</DialogTitle>
					<DialogDescription>
						Appuyez sur <Kbd>?</Kbd> à tout moment pour réafficher cette aide.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					{SHORTCUT_GROUPS.map((group) => (
						<section key={group.title} aria-labelledby={`shortcut-group-${group.title}`}>
							<h3
								id={`shortcut-group-${group.title}`}
								className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase"
							>
								{group.title}
							</h3>
							<ul className="divide-border bg-muted/30 divide-y rounded-md border">
								{group.items.map((item) => (
									<li
										key={item.label}
										className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
									>
										<span className="text-foreground">{item.label}</span>
										{item.keys.length > 0 ? (
											<KbdGroup>
												{item.keys.map((key) => (
													<Kbd key={key}>{key}</Kbd>
												))}
											</KbdGroup>
										) : (
											<span className="text-muted-foreground text-xs italic">Bouton dédié</span>
										)}
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
