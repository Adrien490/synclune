import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * @regression checkout-total-live-region-2026-07-26
 *
 * La région `aria-live` du total vivait dans `SummaryContent`, donc :
 *
 *  1. sur mobile, elle n'était montée que quand le résumé était DÉPLIÉ — or il est
 *     replié par défaut (`isMobileOpen = false`) ;
 *  2. l'instance desktop est en `display:none` sous `md`, donc ignorée des lecteurs
 *     d'écran ;
 *  3. montée AVEC son contenu, elle n'annonçait pas son premier changement même
 *     dépliée (défaut établi par l'audit feedback 2026-07-26, verrouillé par
 *     `live-region-premounted.regression.test.tsx`) ;
 *  4. son `aria-label` était posé sur un `<div>` en `role=generic`, rôle qui
 *     interdit le nommage par l'auteur (ARIA).
 *
 * Conséquence : l'apparition des frais de port après saisie du code postal — le plus
 * gros changement de total du tunnel — n'était annoncée NULLE PART sur mobile.
 *
 * Audit UI/UX paiement 2026-07-26, F3.
 */

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/providers/sheet-store-provider", () => ({
	useSheet: () => ({ open: vi.fn() }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => vi.fn(),
}));

vi.mock("next/image", () => ({
	// `div` et pas `img` : ce test ne regarde pas les images, et un `<img>` nu
	// déclenche la règle eslint `@next/next/no-img-element` (0 warning toléré).
	default: ({ alt }: { alt: string }) => <div role="img" aria-label={alt} />,
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CheckoutSummary } from "../checkout-summary";

const REPO_ROOT = process.cwd();
const SUMMARY_SOURCE = join(REPO_ROOT, "modules/payments/components/checkout-summary.tsx");

const cart = {
	id: "cart-1",
	items: [
		{
			id: "item-1",
			quantity: 1,
			priceAtAdd: 2999,
			sku: {
				id: "sku-1",
				size: null,
				colors: [],
				materials: [],
				images: [],
				product: { title: "Collier Lune" },
			},
		},
	],
} as unknown as Parameters<typeof CheckoutSummary>[0]["cart"];

const baseProps = {
	cart,
	subtotal: 2999,
	shipping: 0,
	shippingUnavailable: false,
	shippingInfo: null,
	total: 2999,
};

afterEach(cleanup);

describe("Checkout — région live unique du total", () => {
	it("est présente et VIDE au premier rendu, résumé mobile replié", () => {
		render(<CheckoutSummary {...baseProps} />);

		const region = screen.getByRole("status");
		expect(region).toBeInTheDocument();
		expect(region).toHaveTextContent("");
	});

	it("annonce le nouveau total dans le MÊME nœud DOM", () => {
		const { rerender } = render(<CheckoutSummary {...baseProps} />);

		const before = screen.getByRole("status");
		rerender(<CheckoutSummary {...baseProps} shipping={490} total={3489} />);
		const after = screen.getByRole("status");

		// Remplacer le nœud (plutôt que muter son texte) empêcherait toute annonce :
		// une région live doit préexister à son contenu.
		expect(after).toBe(before);
		expect(after).toHaveTextContent("Total mis à jour : 34,89 €");
	});

	it("vit en dehors des deux cartes (mobile display:none / desktop display:none)", () => {
		const { container } = render(<CheckoutSummary {...baseProps} />);

		const region = screen.getByRole("status");
		const mobileSection = container.querySelector("section.lg\\:hidden");
		expect(mobileSection).not.toBeNull();
		expect(mobileSection!.contains(region)).toBe(false);
		expect(region.closest("section")).toBeNull();
		// Précède les deux branches : c'est le premier enfant du fragment.
		expect(container.firstElementChild).toBe(region);
	});

	it("annonce la zone non livrable au lieu d'un montant", () => {
		const { rerender } = render(<CheckoutSummary {...baseProps} />);

		rerender(<CheckoutSummary {...baseProps} shippingUnavailable={true} />);

		expect(screen.getByRole("status")).not.toHaveTextContent("Total mis à jour");
		expect(screen.getByRole("status").textContent).not.toBe("");
	});

	it("ne réannonce rien si le total ne change pas", () => {
		const { rerender } = render(<CheckoutSummary {...baseProps} />);

		rerender(<CheckoutSummary {...baseProps} />);

		expect(screen.getByRole("status")).toHaveTextContent("");
	});

	it("le bloc Total ne porte plus ni aria-live ni aria-label", () => {
		// Assertion sur la SOURCE : le bloc n'est monté que dans la branche desktop
		// (`display:none` en jsdom mais présente), et un `aria-label` sur un
		// `role=generic` n'est pas interrogeable de façon fiable par testing-library.
		const source = readFileSync(SUMMARY_SOURCE, "utf-8");
		const stripped = source
			.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/\/\/.*$/gm, "");

		expect(stripped).not.toMatch(/aria-label=\{`Total mis à jour/);
		// Une seule région live dans tout le fichier : celle hissée dans CheckoutSummary.
		expect(stripped.match(/aria-live=/g) ?? []).toHaveLength(1);
	});
});
