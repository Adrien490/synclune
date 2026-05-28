import { afterEach, describe, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { expectNoA11yViolations } from "@/test/a11y/axe";
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from "../field";

/**
 * A11Y-AUDIT-003 — audit axe-core des primitives de formulaire (`field.tsx`)
 * dans leurs états réels, y compris l'état erreur (rarement atteint en e2e).
 *
 * Couvre le câblage label↔input, `aria-invalid`/`aria-describedby`, le
 * `role="alert"` de FieldError et le pattern fieldset/legend.
 */
describe("Field primitives — accessibilité (axe)", () => {
	afterEach(cleanup);

	it("champ texte étiqueté n'a aucune violation", async () => {
		const { container } = render(
			<Field>
				<FieldLabel htmlFor="email">Adresse email</FieldLabel>
				<input id="email" type="email" name="email" />
			</Field>,
		);
		await expectNoA11yViolations(container);
	});

	it("champ en erreur (aria-invalid + aria-describedby + role=alert) n'a aucune violation", async () => {
		const { container } = render(
			<Field>
				<FieldLabel htmlFor="email">Adresse email</FieldLabel>
				<input
					id="email"
					type="email"
					name="email"
					aria-invalid={true}
					aria-describedby="email-error"
				/>
				<FieldError id="email-error" errors={[{ message: "Adresse email invalide" }]} />
			</Field>,
		);
		await expectNoA11yViolations(container);
	});

	it("groupe radio (fieldset/legend) n'a aucune violation", async () => {
		const { container } = render(
			<FieldSet>
				<FieldLegend>Mode de livraison</FieldLegend>
				<Field orientation="horizontal">
					<input id="ship-standard" type="radio" name="shipping" value="standard" />
					<FieldLabel htmlFor="ship-standard">Standard</FieldLabel>
				</Field>
				<Field orientation="horizontal">
					<input id="ship-express" type="radio" name="shipping" value="express" />
					<FieldLabel htmlFor="ship-express">Express</FieldLabel>
				</Field>
			</FieldSet>,
		);
		await expectNoA11yViolations(container);
	});
});
