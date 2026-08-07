/**
 * @regression nested-alert-dialog-backdrop
 *
 * Une confirmation ouverte DANS l'arbre JSX d'une `Sheet` (ou d'un `Drawer`, ou
 * d'un `Dialog`) ne peignait AUCUN scrim : le panneau restait net, à pleine
 * luminosité et sans flou sous elle, alors qu'il n'était plus interactif. Cas
 * signalé sur « Retirer cette pièce de ton panier ? » (`remove-cart-item-alert-dialog`
 * est rendu dans `cart-sheet`), mais le motif est celui de TOUTES nos
 * confirmations — « Effacer tous les filtres ? », « Vider le panier », etc.
 *
 * Cause : Base UI n'active un `Backdrop` que sur `forceRender || !nested`
 * (`dialog/backdrop/DialogBackdrop.js`), et `nested` vaut vrai dès qu'un
 * `DialogRootContext` parent existe — c'est-à-dire exactement la convention du
 * dépôt (« un overlay enfant se rend DANS l'arbre JSX du parent »). Le scrim du
 * PARENT ne compense pas : il est sous le panneau, donc il ne l'assombrit pas.
 *
 * D'où le `forceRender` posé sur `AlertDialogOverlay`. jsdom ne peint rien : ce
 * test verrouille la PRÉSENCE du nœud et son contrat de classes (opacité + flou
 * + `--z-alert`, au-dessus du `--z-overlay` de la sheet).
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "../alert-dialog";
import { Sheet, SheetContent } from "../sheet";

let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	backSpy = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
});

afterEach(() => {
	cleanup();
	backSpy.mockRestore();
});

function overlays() {
	return document.querySelectorAll('[data-slot="alert-dialog-overlay"]');
}

describe("scrim d'une confirmation imbriquée", () => {
	it("rend son scrim quand elle est seule (cas non imbriqué)", () => {
		render(
			<AlertDialog open>
				<AlertDialogContent>
					<AlertDialogTitle>Retirer cette pièce ?</AlertDialogTitle>
				</AlertDialogContent>
			</AlertDialog>,
		);

		expect(overlays()).toHaveLength(1);
	});

	it("rend son scrim quand elle est imbriquée dans une Sheet", () => {
		render(
			<Sheet open>
				<SheetContent title="Panier">
					<AlertDialog open>
						<AlertDialogContent>
							<AlertDialogTitle>Retirer cette pièce ?</AlertDialogTitle>
						</AlertDialogContent>
					</AlertDialog>
				</SheetContent>
			</Sheet>,
		);

		screen.getByText("Retirer cette pièce ?");
		expect(overlays()).toHaveLength(1);
	});

	it("assombrit ET floute, au-dessus du panneau parent", () => {
		render(
			<Sheet open>
				<SheetContent title="Panier">
					<AlertDialog open>
						<AlertDialogContent>
							<AlertDialogTitle>Retirer cette pièce ?</AlertDialogTitle>
						</AlertDialogContent>
					</AlertDialog>
				</SheetContent>
			</Sheet>,
		);

		const overlay = overlays()[0];
		expect(overlay).toBeDefined();
		const className = overlay?.getAttribute("class") ?? "";

		expect(className).toContain("bg-black/50");
		expect(className).toContain("backdrop-blur-sm");
		// `--z-alert` (80) > `--z-overlay` (75), celui du viewport de la sheet :
		// sans ça le scrim passerait SOUS le panneau qu'il doit couvrir.
		expect(className).toContain("z-(--z-alert)");
	});
});
