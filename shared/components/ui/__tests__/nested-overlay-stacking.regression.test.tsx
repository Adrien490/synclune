/**
 * @regression nested-overlay-stacking
 *
 * Une confirmation ouverte depuis une `Sheet` doit s'EMPILER : les deux restent
 * montées, Échap ne ferme que la confirmation, et la sheet reste pleinement
 * interactive une fois la confirmation refermée.
 *
 * Audit « Overlays » 2026-07-26 : ce cas est pourtant le plus fréquent du repo
 * (« Effacer tous les filtres ? » dans `filter-sheet-wrapper`, les deux
 * confirmations du panier, la confirmation d'abandon du formulaire d'adresse) et
 * AUCUN test ne montait un vrai `AlertDialog` dans une vraie `Sheet`. La
 * couverture s'arrêtait à `vaul-nested-context` en isolation.
 *
 * Ce qui est verrouillé ici, et pourquoi ça tient : les deux familles sont des
 * couches Base UI, dont l'empilement (focus, dismiss, verrou de scroll) est géré
 * nativement — c'est ce qui rend l'imbrication sûre, et c'est ce que ce test
 * empêche de casser en silence, par exemple en repassant une des deux familles
 * sur une autre implémentation.
 *
 * ⚠️ Ce fichier a DÉJÀ attrapé la régression qu'il décrit : pendant la migration,
 * la `Sheet` est restée un cycle sur Vaul alors que l'`AlertDialog` était passé
 * à Base UI. Deux piles de couches indépendantes ⇒ Échap fermait la confirmation
 * ET la sheet. C'est ce qui a imposé de migrer les quatre familles ensemble.
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
 * ouverte, la couche du dessous sort de l'arbre d'accessibilité et
 * `queryByRole("dialog")` renvoie `null`. C'est le comportement correct d'un
 * modal empilé — pas un démontage.
 */
const sheetMounted = () => document.querySelector('[data-slot="sheet-content"]');

/**
 * Conteneur de portail de la sheet — c'est LUI que Base UI rend inerte quand une
 * couche s'empile par-dessus (Radix marquait le contenu lui-même).
 */
const sheetPortal = () => document.querySelector('[data-slot="sheet-portal"]');
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
		expect(sheetPortal()).toHaveAttribute("aria-hidden", "true");
		expect(sheetPortal()).toHaveAttribute("data-base-ui-inert");
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

	it("ne laisse aucune couche inerte orpheline après fermeture de la confirmation", () => {
		render(<FiltersSheet />);
		fireEvent.click(screen.getByRole("button", { name: "Tout effacer" }));
		expect(sheetPortal()).toHaveAttribute("data-base-ui-inert");

		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		// Remplace l'ancienne assertion sur `data-scroll-locked` (marqueur de
		// `react-remove-scroll`, que Vaul/Radix embarquaient) : Base UI ne laisse
		// aucune trace DOM de son verrou de scroll. Ce qui reste observable — et
		// qui porte la même garantie — c'est qu'aucune inertie ne survit à la
		// fermeture de la couche supérieure : sinon la sheet resterait visible mais
		// invisible aux lecteurs d'écran et hors du parcours clavier.
		expect(sheetPortal()).not.toHaveAttribute("data-base-ui-inert");
		expect(sheet()).toBeInTheDocument();
	});
});
