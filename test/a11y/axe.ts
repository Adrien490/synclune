import { expect } from "vitest";
import { axe } from "vitest-axe";

type AxeOptions = NonNullable<Parameters<typeof axe>[1]>;

/**
 * Audit axe-core d'un fragment de DOM rendu en jsdom (A11Y-AUDIT-003).
 *
 * Complète la couverture Playwright axe (`e2e/`) en attrapant les violations
 * sur les **états transitoires** rarement atteints en e2e : champ en erreur,
 * `aria-busy`, dropdown ouvert, etc.
 *
 * Limite jsdom : `color-contrast` n'est pas calculable (pas de canvas/layout) →
 * désactivé ici pour éviter le bruit ; le contraste reste couvert par les tests
 * Playwright (rendu réel).
 *
 * N'utilise pas le matcher `toHaveNoViolations` de vitest-axe (exporté en
 * type-only, incompatible avec `verbatimModuleSyntax`) : assertion manuelle avec
 * un message lisible listant chaque règle violée + ses sélecteurs.
 *
 * @example
 * const { container } = render(<MyField error="Requis" />);
 * await expectNoA11yViolations(container);
 */
export async function expectNoA11yViolations(
	container: Element,
	options?: AxeOptions,
): Promise<void> {
	const results = await axe(container, {
		...options,
		rules: { "color-contrast": { enabled: false }, ...options?.rules },
	});

	if (results.violations.length > 0) {
		const detail = results.violations
			.map(
				(violation) =>
					`• [${violation.id}] ${violation.help}\n    ${violation.nodes
						.map((node) => node.target.join(" "))
						.join("\n    ")}`,
			)
			.join("\n");
		expect.fail(
			`${results.violations.length} violation(s) d'accessibilité détectée(s) :\n${detail}`,
		);
	}
}
