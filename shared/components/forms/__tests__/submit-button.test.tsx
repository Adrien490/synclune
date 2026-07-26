import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useAppForm } from "@/shared/components/forms";

interface HarnessProps {
	isPending?: boolean;
	invalid?: boolean;
	showKbdHint?: boolean;
}

function Harness({ isPending = false, invalid = false, showKbdHint = false }: HarnessProps) {
	const form = useAppForm({
		defaultValues: { name: "" },
		validators: invalid ? { onMount: () => "invalide" } : undefined,
	});

	return (
		<form.AppForm>
			<form.SubmitButton
				isPending={isPending}
				idleLabel="Envoyer"
				pendingLabel="Envoi…"
				showKbdHint={showKbdHint}
			/>
		</form.AppForm>
	);
}

afterEach(cleanup);

describe("SubmitButton", () => {
	it("est actif au repos avec le libellé idle", () => {
		render(<Harness />);

		const button = screen.getByRole("button", { name: /envoyer/i });
		expect(button).toBeEnabled();
		expect(button).toHaveAttribute("type", "submit");
		expect(button).toHaveAttribute("aria-busy", "false");
	});

	it("est désactivé avec aria-busy et libellé pending pendant la soumission (anti double-submit)", () => {
		render(<Harness isPending />);

		const button = screen.getByRole("button", { name: /envoi…/i });
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-busy", "true");
	});

	it("est désactivé quand le formulaire ne peut pas être soumis (canSubmit false)", () => {
		render(<Harness invalid />);

		expect(screen.getByRole("button", { name: /envoyer/i })).toBeDisabled();
	});

	it("masque le hint clavier pendant la soumission", () => {
		const { rerender } = render(<Harness showKbdHint />);
		expect(screen.getByText("⌘S")).toBeInTheDocument();

		rerender(<Harness showKbdHint isPending />);
		expect(screen.queryByText("⌘S")).not.toBeInTheDocument();
	});
});
