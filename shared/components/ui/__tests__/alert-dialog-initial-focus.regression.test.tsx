/**
 * @regression alert-dialog-initial-focus-not-on-action-2026-08-04
 *
 * Radix distinguait `AlertDialog.Action` et `AlertDialog.Cancel`, et donnait le
 * focus initial au SECOND — garde-fou classique d'une confirmation destructive :
 * une pression sur Entrée juste après l'ouverture ne doit pas supprimer.
 *
 * Base UI n'a plus qu'un `Close` pour les deux. La distinction ne tient donc
 * plus qu'à l'ordre DOM (Cancel avant Action) et ne repose sur AUCUNE garantie
 * de la librairie : ce test l'exerce sur le vrai composant.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../alert-dialog";

afterEach(cleanup);

function renderConfirm() {
	return render(
		<AlertDialog open>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
					<AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<AlertDialogAction>Supprimer</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>,
	);
}

describe("AlertDialog — focus initial", () => {
	it("ne place JAMAIS le focus initial sur l'action de confirmation", async () => {
		renderConfirm();

		const action = await screen.findByRole("button", { name: "Supprimer" });
		await waitFor(() => expect(document.activeElement).not.toBe(action));
	});

	it("garde des `data-slot` distincts pour l'action et l'annulation", async () => {
		renderConfirm();

		const cancel = await screen.findByRole("button", { name: "Annuler" });
		const action = await screen.findByRole("button", { name: "Supprimer" });

		expect(cancel).toHaveAttribute("data-slot", "alert-dialog-cancel");
		expect(action).toHaveAttribute("data-slot", "alert-dialog-action");
		// Ordre DOM : c'est lui qui porte désormais la sémantique côté clavier.
		expect(cancel.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});
