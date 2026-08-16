import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// Hoisted mocks must be declared before vi.mock calls
const { mockAnimatedNumber, mockHaptic } = vi.hoisted(() => ({
	mockAnimatedNumber: vi.fn(
		({ value, formatter }: { value: number; formatter: (n: number) => string }) => (
			<span data-testid="animated-number">{formatter(value)}</span>
		),
	),
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
	triggerHaptic: mockHaptic,
}));

// Mock next/link — render a plain anchor
vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		onClick,
	}: {
		href: string;
		children: React.ReactNode;
		onClick?: () => void;
	}) => (
		<a href={href} onClick={onClick}>
			{children}
		</a>
	),
}));

// Mock AnimatedNumber to avoid motion/react dependencies
vi.mock("@/shared/components/animations/animated-number", () => ({
	AnimatedNumber: mockAnimatedNumber,
}));

// Mock formatEuro
vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((cents: number) => `${(cents / 100).toFixed(2)} €`),
}));

// Mock SheetFooter to render children directly
vi.mock("@/shared/components/ui/sheet", () => ({
	SheetFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-footer" className={className}>
			{children}
		</div>
	),
}));

// Mock Button
vi.mock("@/shared/components/ui/button", () => ({
	Button: (props: RenderPropMockProps) => renderPropMock("button", props),
}));

// Mock cn
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("../cart-promo-code-form", () => ({
	CartPromoCodeForm: () => <div data-testid="cart-promo-code-form" />,
}));

import { CartSheetFooter } from "../cart-sheet-footer";
import { STOCK_ISSUES_ALERT_ID } from "../stock-issues-alert-id";
import { PRICE_INCREASE_ALERT_ID } from "../price-increase-alert-id";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function createProps(overrides: Partial<React.ComponentProps<typeof CartSheetFooter>> = {}) {
	return {
		totalItems: 2,
		subtotal: 4800,
		isPending: false,
		hasStockIssues: false,
		hasPriceIncrease: false,
		onClose: vi.fn(),
		...overrides,
	};
}

describe("CartSheetFooter", () => {
	it("renders the subtotal via AnimatedNumber", () => {
		render(<CartSheetFooter {...createProps({ subtotal: 4800 })} />);
		expect(screen.getByTestId("animated-number")).toBeInTheDocument();
		expect(screen.getByTestId("animated-number").textContent).toContain("48.00");
	});

	it("displays item count in singular for one item", () => {
		render(<CartSheetFooter {...createProps({ totalItems: 1 })} />);
		expect(screen.getByText(/Sous-total · 1 article/)).toBeInTheDocument();
	});

	it("displays item count in plural for multiple items", () => {
		render(<CartSheetFooter {...createProps({ totalItems: 3 })} />);
		expect(screen.getByText(/Sous-total · 3 articles/)).toBeInTheDocument();
	});

	it("renders checkout link to /paiement when no stock issues", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: false })} />);
		const link = screen.getByRole("link", { name: /Passer commande/i });
		expect(link).toBeInTheDocument();
		expect(link.getAttribute("href")).toBe("/paiement");
	});

	/**
	 * @regression cart-blocked-cta-stays-focusable-2026-08-05
	 *
	 * Le CTA bloqué doit rester ATTEIGNABLE. Avec un `disabled` natif il sortait du tab
	 * order, si bien que son `aria-describedby` — l'unique énoncé du motif de blocage —
	 * n'était jamais annoncé, et qu'aucun survol ni tap ne pouvait le révéler non plus.
	 *
	 * ⚠️ `toBeDisabled()` de jest-dom ne regarde que l'attribut NATIF : il ignore
	 * `aria-disabled`. C'est pourquoi l'assertion est inversée ici — et pourquoi elle ne
	 * dispense pas de vérifier `aria-disabled` juste en dessous.
	 */
	it("rend un bouton bloqué mais focusable, jamais un `disabled` natif", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
		const blocked = screen.getByRole("button", { name: /Passer commande/i });
		expect(blocked).toBeInTheDocument();
		expect(blocked).not.toBeDisabled();
		blocked.focus();
		expect(blocked).toHaveFocus();
	});

	it("sets aria-disabled on the stock-issue button", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
		const disabledButton = screen.getByRole("button", { name: /Passer commande/i });
		expect(disabledButton.getAttribute("aria-disabled")).toBe("true");
	});

	it("references stock-issues-alert via aria-describedby on disabled button", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
		const disabledButton = screen.getByRole("button", { name: /Passer commande/i });
		expect(disabledButton.getAttribute("aria-describedby")).toBe(STOCK_ISSUES_ALERT_ID);
	});

	it("le clic sur le CTA bloqué déplace le focus sur l'alerte", () => {
		// L'alerte vit dans `CartSheet`, pas dans le footer : on la simule pour prouver que
		// le handler la cible bien par son id partagé.
		const alert = document.createElement("div");
		alert.id = STOCK_ISSUES_ALERT_ID;
		alert.tabIndex = -1;
		alert.scrollIntoView = vi.fn();
		document.body.appendChild(alert);

		render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
		fireEvent.click(screen.getByRole("button", { name: /Passer commande/i }));

		expect(alert).toHaveFocus();
		expect(alert.scrollIntoView).toHaveBeenCalled();
		alert.remove();
	});

	it("le clic sur le CTA bloqué ne jette pas si l'alerte est absente", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
		expect(() =>
			fireEvent.click(screen.getByRole("button", { name: /Passer commande/i })),
		).not.toThrow();
	});

	it("does not render a link when stock issues exist", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
		expect(screen.queryByRole("link", { name: /Passer commande/i })).toBeNull();
	});

	it("renders 'Continuer mes achats' button", () => {
		render(<CartSheetFooter {...createProps()} />);
		expect(screen.getByText("Continuer mes achats")).toBeInTheDocument();
	});

	it("calls onClose when 'Continuer mes achats' is clicked", async () => {
		const onClose = vi.fn();
		const { getByText } = render(<CartSheetFooter {...createProps({ onClose })} />);
		getByText("Continuer mes achats").click();
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("calls onClose when checkout link is clicked", async () => {
		const onClose = vi.fn();
		render(<CartSheetFooter {...createProps({ onClose, hasStockIssues: false })} />);
		const link = screen.getByRole("link", { name: /Passer commande/i });
		link.click();
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("triggers medium haptic feedback on checkout click", async () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: false })} />);
		const link = screen.getByRole("link", { name: /Passer commande/i });
		link.click();
		expect(mockHaptic).toHaveBeenCalledWith("medium");
	});

	it("renders the sheet footer wrapper", () => {
		render(<CartSheetFooter {...createProps()} />);
		expect(screen.getByTestId("sheet-footer")).toBeInTheDocument();
	});

	/**
	 * @regression cart-footer-owns-bottom-inset-2026-08-04
	 *
	 * Le footer est le PROPRIÉTAIRE UNIQUE de la marge basse du panier, sur les
	 * deux formats — les deux popups posent `pb-0`.
	 *
	 * Avant, `DrawerContent` ajoutait son `pb-[max(1rem,env(safe-area-inset-bottom))]`
	 * au `pb-4` d'ici : ≥ 32 px de vide sous « Continuer mes achats », sur un
	 * panneau mobile borné à 85 dvh.
	 *
	 * ⚠️ La formule `max()` est load-bearing, pas cosmétique : un `pb-4` nu ferait
	 * passer le CTA sous la barre d'accueil iPhone. Corriger le doublon en
	 * retirant simplement l'`env()` du popup aurait donc échangé un défaut
	 * d'espacement contre un défaut d'atteignabilité.
	 */
	/**
	 * @regression cart-total-no-display-face-tabular-2026-08-04
	 *
	 * `tabular-nums` n'émet que `font-variant-numeric`, dont l'effet dépend de la
	 * feature OpenType `tnum` du fichier servi. **Fraunces ne l'expose pas** — sa
	 * table GSUB ne porte que `kern` et `liga`.
	 *
	 * Mesuré sur le woff2 réellement buildé, à 24 px :
	 * - Fraunces : « 111,11 € » = 80,97 px, « 888,88 € » = 97,11 px → Δ **16,14 px**,
	 *   identique avec ET sans `tabular-nums` (l'utilitaire ne fait rien).
	 * - Figtree : Δ 24,11 px sans, **0,00 px** avec.
	 *
	 * Le sous-total est animé par `AnimatedNumber`, donc il traverse toutes les
	 * valeurs intermédiaires : en display, il se serait mis à gigoter de ~16 px à
	 * chaque changement de quantité, sur le seul chiffre transactionnel du panneau.
	 *
	 * Migration S5 (2026-08-05) : la garde reste NÉCESSAIRE et VALIDE — Winky Sans
	 * (display actuelle) n'expose pas `tnum` non plus, et Onest (sans actuelle)
	 * l'expose (GSUB vérifié à la migration).
	 */
	it("@regression n'associe pas la police display à tabular-nums sur le total", () => {
		render(<CartSheetFooter {...createProps()} />);
		// `AnimatedNumber` est mocké en `<span data-testid="animated-number">` :
		// le porteur des classes est son parent, celui qui reçoit le montant.
		const total = screen.getByTestId("animated-number").parentElement;

		expect(total?.className).toContain("tabular-nums");
		expect(total?.className).not.toContain("font-display");
	});

	it("@regression porte lui-même la marge basse, safe-area comprise", () => {
		render(<CartSheetFooter {...createProps()} />);
		const footer = screen.getByTestId("sheet-footer");

		expect(footer.className).toContain("pb-[max(1rem,env(safe-area-inset-bottom))]");
		// Pas de seconde valeur de padding bas qui viendrait s'y superposer.
		expect(footer.className).not.toMatch(/\bpb-\d/);
	});

	it("renders the shipping fees hint with the rate from SHIPPING_RATES.FR", () => {
		render(<CartSheetFooter {...createProps()} />);
		// SHIPPING_RATES.FR.amount === 499 (4.99 €). The mocked formatEuro returns "4.99 €".
		// Libellé et montant sont deux nœuds depuis que le récapitulatif est une
		// étiquette (le montant s'aligne à droite en `tabular-nums`).
		expect(screen.getByText("Frais postaux dès")).toBeInTheDocument();
		expect(screen.getByText("4.99 €")).toBeInTheDocument();
		expect(screen.getByText(/Calculés à l'étape suivante/)).toBeInTheDocument();
	});

	it("does not render the discount line when no discount is applied", () => {
		render(<CartSheetFooter {...createProps()} />);
		expect(screen.queryByText(/^Réduction/)).not.toBeInTheDocument();
	});

	/**
	 * @regression cart-price-increase-blocks-checkout-2026-08-15
	 *
	 * `createCheckoutSession` facture TOUJOURS le prix courant en base, jamais le
	 * témoin `priceAtAdd` du cookie. Tant qu'une hausse n'est pas actualisée, le
	 * sous-total affiché par le panier diverge donc du montant qui sera réellement
	 * facturé — laisser passer la cliente serait exactement la « surprise » que la
	 * copy de `CartPriceChangeAlert` promet d'éviter. Le CTA doit être bloqué au
	 * même titre qu'un problème de stock, et renvoyer vers l'alerte prix.
	 *
	 * L'audit du 2026-08-15 a montré que ce blocage était DOCUMENTÉ (ex-commentaire
	 * de `cart-cookie.ts` : « refuse la commande si le témoin diverge ») mais n'a
	 * jamais existé dans le code — ce describe est ce qui l'empêche de redisparaître.
	 */
	describe("@regression une hausse de prix non actualisée bloque le passage en caisse", () => {
		it("rend un bouton bloqué (aria-disabled), pas un lien, quand hasPriceIncrease", () => {
			render(<CartSheetFooter {...createProps({ hasPriceIncrease: true })} />);
			expect(screen.queryByRole("link", { name: /Passer commande/i })).toBeNull();
			const blocked = screen.getByRole("button", { name: /Passer commande/i });
			expect(blocked.getAttribute("aria-disabled")).toBe("true");
			expect(blocked).not.toBeDisabled();
		});

		it("décrit le blocage par l'alerte PRIX quand seul le prix bloque", () => {
			render(<CartSheetFooter {...createProps({ hasPriceIncrease: true })} />);
			const blocked = screen.getByRole("button", { name: /Passer commande/i });
			expect(blocked.getAttribute("aria-describedby")).toBe(PRICE_INCREASE_ALERT_ID);
		});

		it("les problèmes de stock priment quand les deux blocages coexistent", () => {
			render(
				<CartSheetFooter {...createProps({ hasPriceIncrease: true, hasStockIssues: true })} />,
			);
			const blocked = screen.getByRole("button", { name: /Passer commande/i });
			expect(blocked.getAttribute("aria-describedby")).toBe(STOCK_ISSUES_ALERT_ID);
		});

		it("le clic sur le CTA bloqué par le prix déplace le focus sur l'alerte prix", () => {
			const alert = document.createElement("div");
			alert.id = PRICE_INCREASE_ALERT_ID;
			alert.tabIndex = -1;
			alert.scrollIntoView = vi.fn();
			document.body.appendChild(alert);

			render(<CartSheetFooter {...createProps({ hasPriceIncrease: true })} />);
			fireEvent.click(screen.getByRole("button", { name: /Passer commande/i }));

			expect(alert).toHaveFocus();
			expect(alert.scrollIntoView).toHaveBeenCalled();
			alert.remove();
		});
	});
});
