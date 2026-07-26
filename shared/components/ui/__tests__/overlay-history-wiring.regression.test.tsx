/**
 * @regression overlay-history-wiring
 *
 * Les quatre wrappers d'overlay doivent reprendre l'entrée d'historique qu'ils
 * ont poussée, sur TOUTES les fermetures — pas seulement sur le retour matériel.
 *
 * Audit « Overlays » 2026-07-26 (P1-1) : `useBackButtonClose` renvoie un
 * `handleClose` qui reprend l'entrée ; seul `Drawer` l'utilisait. `Sheet`,
 * `Dialog` et `AlertDialog` jetaient la valeur de retour — le commentaire de
 * `sheet.tsx` assumait même explicitement le choix. Comme le `pushState` est
 * fait sans URL, l'entrée orpheline porte la même URL que la page : la pression
 * suivante sur le retour matériel ne produisait rien de visible.
 *
 * Le test porte sur le CÂBLAGE des wrappers, là où la logique du hook est
 * couverte par `shared/hooks/__tests__/overlay-history-entry.regression.test.ts`.
 * Les deux sont nécessaires : le hook peut être correct et un wrapper oublier
 * de s'y brancher — c'est exactement ce qui était arrivé à trois d'entre eux.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogTitle,
} from "../alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "../dialog";
import { Sheet, SheetContent } from "../sheet";

let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	backSpy = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
});

afterEach(() => {
	cleanup();
	backSpy.mockRestore();
});

describe("@regression overlay-history-wiring", () => {
	it("Dialog : la croix reprend l'entrée d'historique", () => {
		const onOpenChange = vi.fn();
		render(
			<Dialog open onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogTitle>Modifier le prix</DialogTitle>
				</DialogContent>
			</Dialog>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Fermer la boîte de dialogue" }));

		expect(backSpy).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("Dialog : Escape reprend l'entrée d'historique", () => {
		render(
			<Dialog open onOpenChange={vi.fn()}>
				<DialogContent>
					<DialogTitle>Modifier le prix</DialogTitle>
				</DialogContent>
			</Dialog>,
		);

		fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

		expect(backSpy).toHaveBeenCalledTimes(1);
	});

	it("AlertDialog : Annuler reprend l'entrée d'historique", () => {
		const onOpenChange = vi.fn();
		render(
			<AlertDialog open onOpenChange={onOpenChange}>
				<AlertDialogContent>
					<AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		expect(backSpy).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("Sheet : la croix reprend l'entrée d'historique", () => {
		const onOpenChange = vi.fn();
		render(
			<Sheet open onOpenChange={onOpenChange}>
				<SheetContent title="Panier" />
			</Sheet>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Fermer le panneau" }));

		expect(backSpy).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("n'appelle pas back() à l'ouverture", () => {
		render(
			<Dialog open onOpenChange={vi.fn()}>
				<DialogContent>
					<DialogTitle>Modifier le prix</DialogTitle>
				</DialogContent>
			</Dialog>,
		);

		expect(backSpy).not.toHaveBeenCalled();
	});
});
