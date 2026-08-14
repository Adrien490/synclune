import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * @regression checkout-inline-validation-2026-07-26
 *
 * Pendant comportemental de `checkout-validation-timing.regression.test.ts` : là où
 * celui-ci scanne les sources, celui-ci monte le VRAI `useCheckoutForm` et le VRAI
 * `CheckoutContactSection` (seuls `next/navigation` et l'action `logout` sont mockés)
 * et vérifie le comportement observable.
 *
 * Défaut verrouillé : tous les validateurs du checkout étaient en `onChange` et
 * `InputField` affiche l'erreur dès que `meta.errors` est non vide (aucun gate
 * `isTouched`). Taper « a » dans le champ email affichait donc immédiatement
 * « Entre une adresse email valide », en rouge, avant même que l'utilisateur ait fini
 * de saisir. Audit UI/UX paiement 2026-07-26, F1.
 *
 * Ce test échoue si l'on repasse en `onChange` ou si l'on retire `revalidateLogic` —
 * vérifié en réintroduisant le défaut.
 *
 * NOTE : c'est le seul test du tunnel à monter la vraie chaîne
 * `useAppForm` → `AppField` → `InputField` → `FieldError`. Un mock de
 * `@/shared/components/forms` prouverait seulement que la prop est passée, jamais que
 * l'erreur est (ou n'est pas) rendue.
 */

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/modules/auth/actions/logout", () => ({
	logout: vi.fn(),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckoutContactSection } from "../checkout-contact-section";
import { useCheckoutForm } from "../../hooks/use-checkout-form";

const EMAIL_ERROR = "Entre une adresse email valide";

/** Harnais minimal : le vrai hook de formulaire, la vraie section Contact, en invité. */
function Harness() {
	const { form } = useCheckoutForm();
	return <CheckoutContactSection form={form} />;
}

afterEach(cleanup);

describe("Checkout — pas d'erreur inline à la frappe", () => {
	it("une saisie partielle invalide n'affiche AUCUNE erreur", async () => {
		render(<Harness />);

		const email = screen.getByLabelText(/Adresse email/i);
		await userEvent.type(email, "a");

		expect(screen.queryByText(EMAIL_ERROR)).not.toBeInTheDocument();
		expect(email).not.toHaveAttribute("aria-invalid", "true");
	});

	it("le blur sur une valeur invalide affiche l'erreur", async () => {
		render(<Harness />);

		const email = screen.getByLabelText(/Adresse email/i);
		await userEvent.type(email, "a");
		await userEvent.tab();

		expect(await screen.findByText(EMAIL_ERROR)).toBeInTheDocument();
		expect(email).toHaveAttribute("aria-invalid", "true");
	});

	it("le blur sur une valeur valide n'affiche pas d'erreur", async () => {
		render(<Harness />);

		const email = screen.getByLabelText(/Adresse email/i);
		await userEvent.type(email, "cliente@exemple.fr");
		await userEvent.tab();

		expect(screen.queryByText(EMAIL_ERROR)).not.toBeInTheDocument();
		expect(screen.queryByText("L'adresse email est requise")).not.toBeInTheDocument();
	});

	it("un champ jamais touché reste vierge d'erreur", () => {
		render(<Harness />);

		expect(screen.queryByText("L'adresse email est requise")).not.toBeInTheDocument();
		expect(screen.getByLabelText(/Adresse email/i)).not.toHaveAttribute("aria-invalid", "true");
	});
});
