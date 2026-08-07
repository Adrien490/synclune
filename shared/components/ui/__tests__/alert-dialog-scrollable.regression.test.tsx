/**
 * @regression alert-dialog-scrollable-content
 *
 * `AlertDialogContent` bornait sa hauteur (`max-h-[calc(100dvh-4rem)]`) tout en
 * étant `overflow-hidden`, avec header ET footer en `shrink-0` et aucune zone
 * scrollable. Dès que le contenu dépassait — zoom texte 200 %, paysage mobile
 * (844×390), description longue — il débordait sans scroll et se faisait couper.
 * Le footer étant le dernier enfant, **les boutons Annuler / Confirmer sortaient
 * de l'écran** : toute confirmation destructive (suppression produit, annulation
 * de commande, remboursement) devenait inutilisable.
 *
 * Audit « Confort desktop et robustesse du responsive » 2026-07-26, P1-2.
 *
 * jsdom ne calcule pas de layout : ce test verrouille le **contrat de classes**
 * (une hauteur bornée doit s'accompagner d'un mécanisme de scroll). La preuve
 * comportementale — bouton d'action réellement dans le viewport et cliquable à
 * 200 % — vit dans `e2e/a11y/zoom-a11y.spec.ts`.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

function renderOpenAlert(children: React.ReactNode) {
	return render(
		<AlertDialog open>
			<AlertDialogContent>{children}</AlertDialogContent>
		</AlertDialog>,
	);
}

describe("AlertDialogContent — contenu scrollable (régression P1-2)", () => {
	it("accompagne sa hauteur bornée d'un scroll vertical, jamais d'overflow-hidden", () => {
		renderOpenAlert(
			<AlertDialogHeader>
				<AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
			</AlertDialogHeader>,
		);

		const content = document.querySelector("[data-slot='alert-dialog-content']");
		expect(content).not.toBeNull();
		const classes = content?.className ?? "";

		// La borne de hauteur est voulue (le dialog ne doit pas dépasser l'écran)…
		expect(classes).toMatch(/max-h-/);
		// …mais elle DOIT s'accompagner d'un échappatoire scroll.
		expect(classes).toMatch(/overflow-y-(auto|scroll)/);
		// `overflow-hidden` sur un conteneur borné = contenu définitivement perdu.
		expect(classes).not.toMatch(/\boverflow-hidden\b/);
	});

	it("ne fige pas la hauteur du footer : les actions ne doivent pas être poussées hors du flux", () => {
		renderOpenAlert(
			<>
				<AlertDialogHeader>
					<AlertDialogTitle>Annuler la commande ?</AlertDialogTitle>
					<AlertDialogDescription>
						{"Cette action est irréversible. ".repeat(40)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<AlertDialogAction>Confirmer</AlertDialogAction>
				</AlertDialogFooter>
			</>,
		);

		// Le footer reste dans le conteneur scrollable : atteignable au scroll
		// plutôt que clippé.
		const action = screen.getByRole("button", { name: "Confirmer" });
		const content = action.closest("[data-slot='alert-dialog-content']");
		expect(content).not.toBeNull();
		expect(content?.className ?? "").toMatch(/overflow-y-(auto|scroll)/);

		// `shrink-0` sur le footer appartenait au contrat flex qui produisait le
		// bug : sous `overflow-hidden`, il garantissait que le footer déborde
		// entier plutôt que de se compresser. Il n'a plus lieu d'être.
		const footer = action.closest("[data-slot='alert-dialog-footer']");
		expect(footer).not.toBeNull();
		expect(footer?.className ?? "").not.toMatch(/\bshrink-0\b/);
	});

	it("garde le même contrat via ConfirmDialog", async () => {
		const { ConfirmDialog } = await import("@/shared/components/dialogs/confirm-dialog");

		render(
			<ConfirmDialog
				open
				onClose={() => {}}
				onConfirm={() => {}}
				title="Vider la file ?"
				description="Sans retour."
				confirmLabel="Vider"
			/>,
		);

		const content = document.querySelector("[data-slot='alert-dialog-content']");
		expect(content?.className ?? "").toMatch(/overflow-y-(auto|scroll)/);
		expect(content?.className ?? "").not.toMatch(/\boverflow-hidden\b/);
	});
});
