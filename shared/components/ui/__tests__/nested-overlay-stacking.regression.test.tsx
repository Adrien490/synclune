/**
 * @regression nested-overlay-stacking
 *
 * Une confirmation Radix ouverte depuis une `Sheet` Vaul doit s'EMPILER : les
 * deux restent montées, Échap ne ferme que la confirmation, et la sheet reste
 * pleinement interactive une fois la confirmation refermée.
 *
 * Audit « Overlays » 2026-07-26 : ce cas est pourtant le plus fréquent du repo
 * (« Effacer tous les filtres ? » dans `filter-sheet-wrapper`, les deux
 * confirmations du panier, la confirmation d'abandon du formulaire d'adresse) et
 * AUCUN test ne montait un vrai `AlertDialog` dans une vraie `Sheet`. La
 * couverture s'arrêtait à `vaul-nested-context` en isolation.
 *
 * Ce qui est verrouillé ici, et pourquoi ça tient : Vaul rend un
 * `DialogPrimitive.Content` Radix, donc la sheet et la confirmation sont deux
 * couches Radix. Leur empilement (`FocusScope`, `DismissableLayer`, verrou de
 * scroll unique `react-remove-scroll`) est géré nativement — c'est ce qui rend
 * l'imbrication sûre, et c'est ce que ce test empêche de casser en silence, par
 * exemple en repassant une des deux familles sur une implémentation maison.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogTitle,
} from "../alert-dialog";
import { Sheet, SheetContent } from "../sheet";

let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	backSpy = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
});

afterEach(() => {
	cleanup();
	backSpy.mockRestore();
});

/** Reproduit le motif de `filter-sheet-wrapper` : confirmation DANS l'arbre de la sheet. */
function FiltersSheet({ onConfirm }: { onConfirm?: () => void }) {
	const [sheetOpen, setSheetOpen] = React.useState(true);
	const [confirmOpen, setConfirmOpen] = React.useState(false);

	return (
		<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
			<SheetContent title="Filtres">
				<button type="button" onClick={() => setConfirmOpen(true)}>
					Tout effacer
				</button>
			</SheetContent>

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogTitle>Effacer tous les filtres ?</AlertDialogTitle>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction onClick={onConfirm}>Tout effacer</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</Sheet>
	);
}

/**
 * Présence DOM de la sheet.
 *
 * À ne PAS confondre avec une requête par rôle : quand la confirmation est
 * ouverte, Radix pose `aria-hidden` sur tout ce qui est en dessous, donc la
 * sheet sort de l'arbre d'accessibilité et `queryByRole("dialog")` renvoie
 * `null`. C'est le comportement correct d'un modal empilé — pas un démontage.
 */
const sheetMounted = () => document.querySelector('[data-slot="sheet-content"]');
const sheet = () => screen.queryByRole("dialog", { name: "Filtres" });
const confirm = () => screen.queryByRole("alertdialog");

describe("@regression nested-overlay-stacking", () => {
	it("empile la confirmation sans démonter la sheet", () => {
		render(<FiltersSheet />);
		expect(sheet()).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));

		expect(confirm()).toBeInTheDocument();
		// La sheet ne doit pas se fermer pour laisser place à la confirmation :
		// l'utilisateur perdrait le contexte de ce qu'il est en train de confirmer.
		expect(sheetMounted()).toBeInTheDocument();
	});

	it("masque la sheet aux technologies d'assistance pendant la confirmation", () => {
		render(<FiltersSheet />);
		fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));

		// Corollaire du test précédent : montée, mais hors de l'arbre
		// d'accessibilité. Un lecteur d'écran ne doit percevoir que la couche du
		// dessus, sinon la confirmation n'est plus vraiment modale.
		expect(sheet()).not.toBeInTheDocument();
		expect(sheetMounted()).toHaveAttribute("aria-hidden", "true");
	});

	it("Échap ne ferme que la confirmation, pas la sheet", () => {
		render(<FiltersSheet />);
		fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));

		fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

		expect(confirm()).not.toBeInTheDocument();
		expect(sheet()).toBeInTheDocument();
	});

	it("laisse la sheet interactive après annulation de la confirmation", () => {
		render(<FiltersSheet />);
		fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));
		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		expect(confirm()).not.toBeInTheDocument();

		// Le déclencheur de la sheet doit rester cliquable : si la couche
		// supérieure laissait derrière elle un `pointer-events: none` ou un
		// focus-trap orphelin, la sheet resterait visible mais morte.
		fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));
		expect(confirm()).toBeInTheDocument();
	});

	it("confirmer exécute l'action et referme la confirmation seule", () => {
		const onConfirm = vi.fn();
		render(<FiltersSheet onConfirm={onConfirm} />);
		fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));

		fireEvent.click(screen.getAllByRole("button", { name: "Tout effacer" }).at(-1)!);

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(confirm()).not.toBeInTheDocument();
		expect(sheet()).toBeInTheDocument();
	});

	it("un seul verrou de scroll est posé pour les deux couches", () => {
		render(<FiltersSheet />);
		fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));

		// `react-remove-scroll` marque le body une seule fois, quel que soit le
		// nombre de couches — c'est ce qui garantit qu'aucun verrou ne survit à la
		// fermeture de la couche supérieure.
		expect(document.body).toHaveAttribute("data-scroll-locked");
	});
});
