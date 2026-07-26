/**
 * @regression select-field-desktop-a11y — le trigger desktop est nommé, et rien
 * d'interactif n'est imbriqué dedans.
 *
 * Bugs corrigés (audit formulaires 2026-07-26) :
 *
 * 1. `SelectField` rend DEUX contrôles (select natif `md:hidden`, trigger Radix
 *    `hidden md:block`). Le `FieldLabel htmlFor` ciblait le select natif — en
 *    `display:none` au-delà de `md` — si bien que le trigger desktop n'avait
 *    AUCUN nom accessible (WCAG 4.1.2 / 3.3.2) et qu'un clic sur le label visible
 *    ne faisait rien.
 * 2. Le bouton « Effacer la sélection » était un `div role="button" tabIndex={0}`
 *    rendu À L'INTÉRIEUR du `<button>` du SelectTrigger : imbrication interactive
 *    invalide en HTML, exposition non fiable aux lecteurs d'écran, et handler
 *    Espace/Entrée en conflit avec l'ouverture du Select.
 *
 * Les mocks ci-dessous restent fidèles là où c'est le sujet du test : le trigger
 * est un vrai `<button>` qui relaie ses props, le label un vrai `<label id>`.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mockHandleChange, mockHandleBlur } = vi.hoisted(() => ({
	mockHandleChange: vi.fn(),
	mockHandleBlur: vi.fn(),
}));

vi.mock("@/shared/lib/form-context", () => ({
	useFieldContext: () => ({
		name: "country",
		state: { value: "fr", meta: { errors: [] } },
		handleChange: mockHandleChange,
		handleBlur: mockHandleBlur,
	}),
}));

vi.mock("@/shared/components/ui/field", () => ({
	Field: ({ children, ...props }: React.ComponentProps<"div">) => <div {...props}>{children}</div>,
	FieldError: () => null,
}));

vi.mock("@/shared/components/ui/native-select", () => ({
	NativeSelect: ({ children, ...props }: React.ComponentProps<"select">) => (
		<select {...props}>{children}</select>
	),
	NativeSelectOption: ({ children, ...props }: React.ComponentProps<"option">) => (
		<option {...props}>{children}</option>
	),
}));

// Fidélité volontaire : `SelectTrigger` est un vrai <button role="combobox">,
// comme Radix — c'est précisément ce que le test vérifie.
vi.mock("@/shared/components/ui/select", () => ({
	Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	SelectTrigger: ({ children, ...props }: React.ComponentProps<"button">) => (
		// Radix pose aussi aria-controls/aria-expanded : on les reproduit pour que le
		// rôle combobox soit valide (et que le lint a11y ne râle pas sur le mock).
		<button type="button" role="combobox" aria-controls="listbox" aria-expanded={false} {...props}>
			{children}
		</button>
	),
	SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
	SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, ...props }: React.ComponentProps<"button">) => (
		<button {...props}>{children}</button>
	),
}));

vi.mock("./field-label", () => ({
	FieldLabel: ({ id, htmlFor, children }: React.ComponentProps<"label"> & { id?: string }) => (
		<label id={id} htmlFor={htmlFor}>
			{children}
		</label>
	),
}));

vi.mock("lucide-react", () => ({ X: () => <span /> }));

import { SelectField } from "../select-field";

const OPTIONS = [
	{ value: "fr", label: "France" },
	{ value: "be", label: "Belgique" },
];

/**
 * jsdom ignore les media queries : le select natif (mobile) ET le trigger Radix
 * (desktop) sont tous deux dans le DOM, et tous deux `role="combobox"`. On cible
 * donc explicitement le trigger desktop.
 */
function getDesktopTrigger(): HTMLElement {
	const trigger = screen.getAllByRole("combobox").find((el) => el.tagName === "BUTTON");
	if (!trigger) throw new Error("trigger desktop introuvable");
	return trigger;
}

describe("@regression select-field-desktop-a11y", () => {
	afterEach(cleanup);

	it("names the desktop trigger from the visible label", () => {
		render(<SelectField options={OPTIONS} label="Pays" />);

		// Échouait avant le fix : le trigger n'avait ni aria-label ni aria-labelledby,
		// donc aucun nom accessible.
		const named = screen.getAllByRole("combobox", { name: /Pays/ });
		expect(named).toContain(getDesktopTrigger());
	});

	it("points aria-labelledby at the label element itself", () => {
		render(<SelectField options={OPTIONS} label="Pays" />);

		const trigger = getDesktopTrigger();
		const labelId = trigger.getAttribute("aria-labelledby");
		expect(labelId).toBeTruthy();
		expect(document.getElementById(labelId!)?.tagName).toBe("LABEL");
	});

	it("omits aria-labelledby when the field has no label", () => {
		render(<SelectField options={OPTIONS} />);

		expect(getDesktopTrigger()).not.toHaveAttribute("aria-labelledby");
	});

	it("never nests an interactive control inside the trigger", () => {
		render(<SelectField options={OPTIONS} label="Pays" clearable />);

		const trigger = getDesktopTrigger();
		expect(trigger.querySelector("button,[role='button'],[tabindex]")).toBeNull();
	});

	it("renders the clear control as a sibling of the trigger", () => {
		render(<SelectField options={OPTIONS} label="Pays" clearable />);

		const clear = screen.getByRole("button", { name: "Effacer la sélection" });
		const trigger = getDesktopTrigger();
		expect(trigger.contains(clear)).toBe(false);
		expect(clear.parentElement).toBe(trigger.parentElement);
	});
});
