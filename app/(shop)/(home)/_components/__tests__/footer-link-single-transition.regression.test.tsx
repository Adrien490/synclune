/**
 * @regression footer-link-single-transition
 *
 * `FooterLink` compose sa className en CONCATÉNANT celle de l'appelant avec son
 * socle tactile (`footer-link.tsx`) — pas via `cn()` / tailwind-merge. Les deux
 * jeux de classes arrivent donc INTACTS dans l'attribut `class`, et si les deux
 * déclarent `transition-*` ou `duration-*`, c'est l'ordre d'ÉMISSION de Tailwind
 * qui tranche — jamais l'ordre d'écriture.
 *
 * C'est exactement ce qui s'était produit : les trois constantes de `footer.tsx`
 * déclaraient `motion-safe:transition-colors motion-safe:duration-[var(--duration-normal)]`,
 * le socle `motion-safe:transition-transform motion-safe:duration-150`. Dans le CSS
 * compilé, `.motion-safe\:transition-transform` est émis APRÈS
 * `.motion-safe\:transition-colors` — la propriété effective était donc
 * `transform,translate,scale,rotate`, et le fond de survol des 12 liens du footer
 * claquait sans le moindre fondu. L'intention était écrite en quatre endroits et
 * ne se produisait nulle part.
 *
 * Rien dans la chaîne d'outils ne voyait ce conflit : ni ESLint, ni `tsc`, ni
 * jsdom (qui n'applique aucune feuille Tailwind), ni
 * `no-orphan-variant-token.regression.test.ts` (qui ne cherche que des className
 * corrompues). D'où ce test.
 *
 * ⚠️ Ne PAS « corriger » un futur échec en basculant `FooterLink` sur `cn()` :
 * tailwind-merge résoudrait le conflit en supprimant silencieusement la classe de
 * l'appelant — même résultat à l'écran, et ce test deviendrait aveugle. Le défaut
 * à empêcher est la double déclaration elle-même. Un seul déclarant :
 * `BASE_TACTILE_CLASSES`.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const { BASE_TACTILE_CLASSES, FooterLink } = await import("../footer-link");

/**
 * Isole les utilitaires qui écrivent `transition-property` / `transition-duration`,
 * variantes comprises (`motion-safe:`, `can-hover:`…). On ne compte QUE la partie
 * utilitaire, après le dernier `:` — deux variantes différentes du même utilitaire
 * restent deux déclarations concurrentes dès que leurs media queries se recouvrent.
 */
function transitionUtilities(className: string) {
	const tokens = className.split(/\s+/).filter(Boolean);
	const utility = (token: string) => token.slice(token.lastIndexOf(":") + 1);

	return {
		property: tokens.filter((t) => /^transition(-|$)/.test(utility(t))),
		duration: tokens.filter((t) => /^duration-/.test(utility(t))),
	};
}

describe("@regression footer-link-single-transition", () => {
	afterEach(cleanup);

	it("BASE_TACTILE_CLASSES declares exactly one transition-property and one duration", () => {
		const { property, duration } = transitionUtilities(BASE_TACTILE_CLASSES);

		expect(property).toHaveLength(1);
		expect(duration).toHaveLength(1);
	});

	it("animates colour AND transform — a transform-only list is the bug this locks", () => {
		const [property] = transitionUtilities(BASE_TACTILE_CLASSES).property;

		// Le survol change `background-color` (bg-primary/5, bg-accent) et `color`
		// (text-accent-foreground) ; l'appui change `transform` (active:scale).
		// Les trois doivent être dans la MÊME liste, puisqu'il n'y en a qu'une.
		expect(property).toContain("transform");
		expect(property).toContain("color");
		expect(property).toContain("background-color");
	});

	it.each([
		["sans className appelante", undefined],
		["avec une className appelante", "text-muted-foreground can-hover:hover:bg-accent rounded-lg"],
	])("a rendered FooterLink carries a single transition declaration (%s)", (_label, className) => {
		render(
			<FooterLink href="/produits" className={className}>
				Les créations
			</FooterLink>,
		);

		const rendered = screen.getByRole("link").getAttribute("class") ?? "";
		const { property, duration } = transitionUtilities(rendered);

		expect(property).toHaveLength(1);
		expect(duration).toHaveLength(1);
	});

	it("the footer's own class constants declare no transition of their own", async () => {
		// Lecture du SOURCE : les constantes sont locales au module footer, non
		// exportées. C'est volontaire — les exporter pour les tester élargirait leur
		// surface publique sans raison.
		const source = await readFile(
			path.join(process.cwd(), "app/(shop)/(home)/_components/footer.tsx"),
			"utf8",
		);

		// Les trois constantes de classe + la className inline du lien mailto.
		const classConstants = source.matchAll(/(?:_CLASS =\s*|className=)"([^"]*)"/g);

		for (const [, className] of classConstants) {
			const { property, duration } = transitionUtilities(className!);

			expect(
				[...property, ...duration],
				`« ${className!.slice(0, 60)}… » redéclare une transition. Le seul déclarant du ` +
					`footer est BASE_TACTILE_CLASSES (footer-link.tsx) : une seconde déclaration ` +
					`entre en concurrence avec la sienne, et c'est l'ordre d'émission Tailwind qui ` +
					`tranche — pas l'ordre d'écriture.`,
			).toEqual([]);
		}
	});
});
