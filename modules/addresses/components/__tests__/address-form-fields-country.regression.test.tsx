/**
 * @regression address-country-hidden-input
 *
 * Le champ pays est affiché en `disabled` (livraison FR only). Or un input
 * `disabled` est EXCLU du FormData natif soumis à la Server Action → le
 * serveur recevait `country: null`, que `z.enum(...).default("FR")` rejette
 * (`.default()` ne couvre que `undefined`). Toute création/édition d'adresse
 * échouait avec l'erreur pays. Le fix ajoute un `<input type="hidden"
 * name="country">` qui porte la valeur soumise, le champ disabled ne servant
 * qu'à l'affichage (« France »).
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-form", () => ({
	useStore: vi.fn(() => ""),
}));

vi.mock("@/modules/addresses/hooks/use-address-autocomplete", () => ({
	useAddressAutocomplete: () => ({
		suggestions: [],
		isSearching: false,
		error: null,
	}),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p>Champs obligatoires</p>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children }: { children: React.ReactNode }) => (
		<button type="button">{children}</button>
	),
}));

import React from "react";
import { AddressFormFields } from "../address-form-fields";
import type { AddressFormInstance } from "../../hooks/use-address-form";

const FIELD_VALUES: Record<string, string> = {
	firstName: "Marie",
	lastName: "Dupont",
	address1: "12 Rue de la Paix",
	address2: "",
	postalCode: "75001",
	city: "Paris",
	country: "FR",
	phone: "+33612345678",
};

interface FieldComponentProps {
	label?: string;
	disabled?: boolean;
	value?: string;
	[key: string]: unknown;
}

function createFakeForm(): AddressFormInstance {
	const AppField = ({
		name,
		children,
	}: {
		name: string;
		children: (field: Record<string, unknown>) => React.ReactNode;
	}) =>
		children({
			name,
			handleChange: vi.fn(),
			handleBlur: vi.fn(),
			state: { value: FIELD_VALUES[name] ?? "", meta: { errors: [] } },
			InputField: ({ label, disabled, value }: FieldComponentProps) => (
				<input
					aria-label={label}
					disabled={disabled}
					value={value ?? FIELD_VALUES[name] ?? ""}
					readOnly
				/>
			),
			AutocompleteField: ({ label }: FieldComponentProps) => <input aria-label={label} />,
			PhoneField: ({ label }: FieldComponentProps) => <input aria-label={label} />,
		});

	return {
		AppField,
		setFieldValue: vi.fn(),
		store: {},
	} as unknown as AddressFormInstance;
}

afterEach(() => {
	cleanup();
});

describe("AddressFormFields — champ pays (régression FormData)", () => {
	it("rend un input hidden name=country portant la valeur soumise", () => {
		const { container } = render(<AddressFormFields form={createFakeForm()} isPending={false} />);

		const hidden = container.querySelector<HTMLInputElement>(
			'input[type="hidden"][name="country"]',
		);
		expect(hidden).not.toBeNull();
		expect(hidden!.value).toBe("FR");
		expect(hidden!.disabled).toBe(false);
	});

	it("affiche le libellé humain du pays dans le champ désactivé", () => {
		const { container } = render(<AddressFormFields form={createFakeForm()} isPending={false} />);

		const visible = container.querySelector<HTMLInputElement>('input[aria-label="Pays"]');
		expect(visible).not.toBeNull();
		expect(visible!.disabled).toBe(true);
		expect(visible!.value).toBe("France");
	});
});
