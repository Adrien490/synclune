"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { Kbd, KbdGroup } from "@/shared/components/ui/kbd";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect } from "react";

interface ShortcutEntry {
	keys: ReadonlyArray<string>;
	label: string;
}

interface ShortcutGroup {
	title: string;
	items: ReadonlyArray<ShortcutEntry>;
}

const SHORTCUT_GROUPS: ReadonlyArray<ShortcutGroup> = [
	{
		title: "Navigation",
		items: [
			{ keys: ["⌘", "B"], label: "Afficher / masquer la barre latérale" },
			{ keys: ["?"], label: "Afficher cette aide" },
			{ keys: ["Echap"], label: "Fermer le dialogue ou le menu actif" },
		],
	},
	{
		title: "Listes & pagination",
		items: [
			{ keys: ["⌥", "←"], label: "Page précédente" },
			{ keys: ["⌥", "→"], label: "Page suivante" },
		],
	},
	{
		title: "Formulaires",
		items: [
			{ keys: ["⌘", "S"], label: "Enregistrer (création / édition produit)" },
			{ keys: ["Echap"], label: "Annuler la saisie en cours" },
		],
	},
	{
		title: "Recherche",
		items: [
			{
				keys: [],
				label: "Recherche rapide via la barre d'actions (haut mobile, bas listes admin)",
			},
		],
	},
];

const DIALOG_ID = "admin-keyboard-shortcuts";

function isInteractiveTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/**
 * Aide raccourcis clavier admin.
 *
 * Écoute `?` (Shift+/) globalement sur /admin pour ouvrir la cheatsheet.
 * Skip les inputs/textareas/contenteditable pour ne pas intercepter la saisie.
 */
export function KeyboardShortcutsDialog() {
	const { isOpen, open, close } = useDialog(DIALOG_ID);

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
			<DialogContent className="max-w-lg">
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

export const KEYBOARD_SHORTCUTS_DIALOG_ID = DIALOG_ID;
