/**
 * @regression gated-form-submit — la Server Action ne part jamais sur un
 * formulaire client invalide, ni deux fois pour une même soumission.
 *
 * Bugs corrigés (audit formulaires 2026-07-26) :
 *
 * 1. Les formulaires en `action={action}` n'appelaient pas `preventDefault()` :
 *    React déclenchait l'action AVANT le verdict de la validation TanStack
 *    (asynchrone). Sur `/connexion`, `sign-in-email.ts` appliquait alors son rate
 *    limit (5 essais / 15 min par IP) avant `validateInput` — cinq fautes de
 *    frappe verrouillaient donc un utilisateur qui avait le bon mot de passe.
 * 2. `disabled` sur le bouton ne couvre pas la touche Entrée, et `useActionState`
 *    sérialise les dispatchs au lieu de les ignorer : une double soumission
 *    créait deux adresses / deux demandes de changement d'e-mail.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useGatedFormSubmit } from "../use-gated-form-submit";

vi.mock("@/shared/utils/toast", () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("@/shared/lib/logger", () => ({
	logger: { error: vi.fn() },
}));

function makeForm(isValid: boolean, isSubmitting = false) {
	return {
		handleSubmit: vi.fn(() => Promise.resolve()),
		state: { isValid, isSubmitting },
	};
}

function Harness(props: {
	form: ReturnType<typeof makeForm>;
	action: (formData: FormData) => void;
	isPending?: boolean;
	extraBusy?: boolean;
	focusFirstInvalid?: () => void;
}) {
	const onSubmit = useGatedFormSubmit({
		form: props.form,
		action: props.action,
		isPending: props.isPending ?? false,
		extraBusy: props.extraBusy,
		focusFirstInvalid: props.focusFirstInvalid ?? (() => undefined),
		context: "Harness",
	});

	return (
		<form onSubmit={onSubmit} aria-label="harness">
			<input name="email" defaultValue="a@b.co" />
			<button type="submit">Envoyer</button>
		</form>
	);
}

/** `requestAnimationFrame` + microtâches de `runAfterValidation`. */
async function flush() {
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

describe("@regression gated-form-submit", () => {
	// Le setup global ne fait que `restoreAllMocks` : sans cleanup, les <form>
	// s'accumulent dans le DOM et `getByRole("form")` devient ambigu.
	afterEach(cleanup);

	it("dispatches the action with the form data when the client form is valid", async () => {
		const action = vi.fn();
		render(<Harness form={makeForm(true)} action={action} />);

		fireEvent.submit(screen.getByRole("form", { name: "harness" }));
		await flush();

		expect(action).toHaveBeenCalledTimes(1);
		const formData = action.mock.calls[0]![0] as FormData;
		expect(formData.get("email")).toBe("a@b.co");
	});

	it("never dispatches the action when the client form is invalid — it focuses instead", async () => {
		const action = vi.fn();
		const focusFirstInvalid = vi.fn();
		render(
			<Harness form={makeForm(false)} action={action} focusFirstInvalid={focusFirstInvalid} />,
		);

		fireEvent.submit(screen.getByRole("form", { name: "harness" }));
		await flush();

		expect(action).not.toHaveBeenCalled();
		expect(focusFirstInvalid).toHaveBeenCalledTimes(1);
	});

	it("validates before deciding (handleSubmit runs even on an untouched form)", async () => {
		// Les validateurs sont `onChange` : sur un formulaire vierge, `canSubmit`
		// vaut true. Seul `handleSubmit()` révèle l'invalidité — le gate doit donc
		// l'attendre, pas se fier à `canSubmit`.
		const form = makeForm(false);
		render(<Harness form={form} action={vi.fn()} />);

		fireEvent.submit(screen.getByRole("form", { name: "harness" }));
		await flush();

		expect(form.handleSubmit).toHaveBeenCalledTimes(1);
	});

	it("ignores a resubmission while the action is pending (Enter key, not just the button)", async () => {
		const action = vi.fn();
		render(<Harness form={makeForm(true)} action={action} isPending />);

		// `fireEvent.submit` reproduit la soumission par Entrée : elle contourne le
		// `disabled` du bouton.
		fireEvent.submit(screen.getByRole("form", { name: "harness" }));
		await flush();

		expect(action).not.toHaveBeenCalled();
	});

	it("ignores a submission while the form is already submitting", async () => {
		const action = vi.fn();
		render(<Harness form={makeForm(true, true)} action={action} />);

		fireEvent.submit(screen.getByRole("form", { name: "harness" }));
		await flush();

		expect(action).not.toHaveBeenCalled();
	});

	it("ignores a submission while an upload is still in flight (extraBusy)", async () => {
		const action = vi.fn();
		render(<Harness form={makeForm(true)} action={action} extraBusy />);

		fireEvent.submit(screen.getByRole("form", { name: "harness" }));
		await flush();

		expect(action).not.toHaveBeenCalled();
	});
});
