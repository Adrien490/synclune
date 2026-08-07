import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "../confirm-dialog";

let backSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	backSpy = vi.spyOn(window.history, "back").mockImplementation(() => undefined);
});

afterEach(() => {
	cleanup();
	backSpy.mockRestore();
});

const base = {
	open: true,
	onClose: () => {},
	title: "Confirmer la suppression",
	description: "Cette action est irréversible.",
	confirmLabel: "Supprimer",
} as const;

function confirmButton() {
	return screen.getByRole("button", { name: "Supprimer" });
}

describe("ConfirmDialog — structure", () => {
	it("rend titre, description et les deux boutons", () => {
		render(<ConfirmDialog {...base} onConfirm={() => {}} />);

		expect(screen.getByText("Confirmer la suppression")).toBeInTheDocument();
		expect(screen.getByText("Cette action est irréversible.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
		expect(confirmButton()).toBeInTheDocument();
	});

	it("place Annuler AVANT Confirmer dans le DOM (garde-fou du focus initial)", () => {
		render(<ConfirmDialog {...base} onConfirm={() => {}} />);

		const cancel = screen.getByRole("button", { name: "Annuler" });
		expect(cancel.compareDocumentPosition(confirmButton())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	it("rend la description dans un `div`, jamais un `p` (un `p` imbriqué casse l'hydratation)", () => {
		render(
			<ConfirmDialog
				{...base}
				onConfirm={() => {}}
				description={<p>Prose de l&apos;appelante.</p>}
			/>,
		);

		const description = screen.getByText("Prose de l'appelante.").parentElement;
		expect(description?.tagName).toBe("DIV");
	});

	it("rend `children` entre la description et le footer, DANS le formulaire", () => {
		render(
			<ConfirmDialog {...base} action={() => {}}>
				<textarea name="reason" defaultValue="motif" />
			</ConfirmDialog>,
		);

		const form = document.querySelector("form");
		expect(form?.querySelector('textarea[name="reason"]')).not.toBeNull();
	});

	it("masque Annuler avec `hideCancel`", () => {
		render(<ConfirmDialog {...base} onConfirm={() => {}} hideCancel confirmLabel="Compris" />);

		expect(screen.queryByRole("button", { name: "Annuler" })).toBeNull();
		expect(screen.getByRole("button", { name: "Compris" })).toBeInTheDocument();
	});

	it("accepte un libellé d'annulation personnalisé", () => {
		render(<ConfirmDialog {...base} onConfirm={() => {}} cancelLabel="Fermer" />);

		expect(screen.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
	});
});

describe("ConfirmDialog — champs cachés", () => {
	it("émet un input caché par entrée de `fields`", () => {
		render(<ConfirmDialog {...base} action={() => {}} fields={{ id: "order_1", quantity: 3 }} />);

		expect(document.querySelector<HTMLInputElement>('input[name="id"]')?.value).toBe("order_1");
		expect(document.querySelector<HTMLInputElement>('input[name="quantity"]')?.value).toBe("3");
	});

	it("convertit `null` et `undefined` en chaîne vide (jamais d'attribut `value` manquant)", () => {
		render(<ConfirmDialog {...base} action={() => {}} fields={{ id: undefined, note: null }} />);

		expect(document.querySelector<HTMLInputElement>('input[name="id"]')?.value).toBe("");
		expect(document.querySelector<HTMLInputElement>('input[name="note"]')?.value).toBe("");
	});
});

describe("ConfirmDialog — les trois modes de soumission", () => {
	it("mode `action` : bouton `submit` dans un formulaire", () => {
		render(<ConfirmDialog {...base} action={() => {}} />);

		expect(document.querySelector("form")).not.toBeNull();
		expect(confirmButton()).toHaveAttribute("type", "submit");
	});

	it("mode `onSubmit` : le handler de l'appelante reçoit l'événement", () => {
		const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
		render(<ConfirmDialog {...base} onSubmit={onSubmit} />);

		confirmButton().click();

		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("mode `onConfirm` : aucun formulaire, bouton `button`, handler appelé", () => {
		const onConfirm = vi.fn();
		render(<ConfirmDialog {...base} onConfirm={onConfirm} />);

		expect(document.querySelector("form")).toBeNull();
		expect(confirmButton()).toHaveAttribute("type", "button");

		confirmButton().click();
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});
});

describe("ConfirmDialog — fermeture et garde de validation", () => {
	it("appelle `onClose` sur Annuler", () => {
		const onClose = vi.fn();
		render(<ConfirmDialog {...base} onClose={onClose} onConfirm={() => {}} />);

		screen.getByRole("button", { name: "Annuler" }).click();

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("ne rend rien quand `open` est faux", () => {
		render(<ConfirmDialog {...base} open={false} onConfirm={() => {}} />);

		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("`confirmDisabled` désactive la confirmation SANS toucher à Annuler", () => {
		const onConfirm = vi.fn();
		render(<ConfirmDialog {...base} onConfirm={onConfirm} confirmDisabled />);

		expect(confirmButton()).toBeDisabled();
		expect(screen.getByRole("button", { name: "Annuler" })).not.toBeDisabled();

		confirmButton().click();
		expect(onConfirm).not.toHaveBeenCalled();
	});
});

describe("ConfirmDialog — tone", () => {
	it("transmet le tone à l'action (la traduction en classes vit dans la primitive)", () => {
		render(<ConfirmDialog {...base} onConfirm={() => {}} tone="destructive" />);

		expect(confirmButton()).toHaveAttribute("data-tone", "destructive");
	});

	it("sans tone : aucun `data-tone` (donc aucune vibration ajoutée en silence)", () => {
		render(<ConfirmDialog {...base} onConfirm={() => {}} />);

		expect(confirmButton()).not.toHaveAttribute("data-tone");
	});
});
