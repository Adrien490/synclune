import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks must be declared before vi.mock calls
const { mockAnimatedNumber, mockHaptic, mockOrdersFlag } = vi.hoisted(() => ({
	mockAnimatedNumber: vi.fn(
		({ value, formatter }: { value: number; formatter: (n: number) => string }) => (
			<span data-testid="animated-number">{formatter(value)}</span>
		),
	),
	mockHaptic: vi.fn(),
	mockOrdersFlag: { available: true },
}));

// Mock le SSOT de disponibilité des commandes (getter → override par test).
// L'avis de pause est rendu via <OrdersClosedNotice />, qui lit ORDERS_PAUSED_NOTICE.
vi.mock("@/shared/constants/orders-availability", () => ({
	get ORDERS_AVAILABLE() {
		return mockOrdersFlag.available;
	},
	ORDERS_PAUSED_SHORT_MESSAGE: "Les commandes ne sont pas encore ouvertes.",
	ORDERS_PAUSED_NOTICE: {
		title: "Le site est actuellement en pause.",
		body: "Les commandes ne sont pas encore ouvertes. Vous pouvez me contacter par mail :",
		email: "synclune@gmail.com",
	},
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
	Button: ({
		children,
		disabled,
		asChild,
		"aria-disabled": ariaDisabled,
		"aria-describedby": ariaDescribedby,
		...props
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		asChild?: boolean;
		"aria-disabled"?: boolean | "true" | "false";
		"aria-describedby"?: string;
	}) => {
		if (asChild) {
			// Render children directly when asChild is true (Slot-like behaviour)
			return <>{children}</>;
		}
		return (
			<button
				disabled={disabled}
				aria-disabled={ariaDisabled}
				aria-describedby={ariaDescribedby}
				{...props}
			>
				{children}
			</button>
		);
	},
}));

// Mock cn
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("../cart-promo-code-form", () => ({
	CartPromoCodeForm: () => <div data-testid="cart-promo-code-form" />,
}));

import { CartSheetFooter } from "../cart-sheet-footer";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	// Reset au défaut (commandes ouvertes) — les tests "pause" l'override localement.
	mockOrdersFlag.available = true;
});

function createProps(overrides: Partial<React.ComponentProps<typeof CartSheetFooter>> = {}) {
	return {
		totalItems: 2,
		subtotal: 4800,
		isPending: false,
		hasStockIssues: false,
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
		expect(screen.getByText(/Sous-total \(1 article\)/)).toBeInTheDocument();
	});

	it("displays item count in plural for multiple items", () => {
		render(<CartSheetFooter {...createProps({ totalItems: 3 })} />);
		expect(screen.getByText(/Sous-total \(3 articles\)/)).toBeInTheDocument();
	});

	it("renders checkout link to /paiement when no stock issues", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: false })} />);
		const link = screen.getByRole("link", { name: /Passer commande/i });
		expect(link).toBeInTheDocument();
		expect(link.getAttribute("href")).toBe("/paiement");
	});

	it("renders disabled button instead of link when stock issues exist", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
		const disabledButton = screen.getByRole("button", { name: /Passer commande/i });
		expect(disabledButton).toBeInTheDocument();
		expect(disabledButton).toBeDisabled();
	});

	it("sets aria-disabled on the stock-issue button", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
		const disabledButton = screen.getByRole("button", { name: /Passer commande/i });
		expect(disabledButton.getAttribute("aria-disabled")).toBe("true");
	});

	it("references stock-issues-alert via aria-describedby on disabled button", () => {
		render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
		const disabledButton = screen.getByRole("button", { name: /Passer commande/i });
		expect(disabledButton.getAttribute("aria-describedby")).toBe("stock-issues-alert");
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

	describe("when orders are not available (ORDERS_AVAILABLE=false)", () => {
		beforeEach(() => {
			mockOrdersFlag.available = false;
		});

		it("renders a disabled 'Passer commande' button instead of a checkout link", () => {
			render(<CartSheetFooter {...createProps({ hasStockIssues: false })} />);
			expect(screen.queryByRole("link", { name: /Passer commande/i })).toBeNull();
			const button = screen.getByRole("button", { name: /Passer commande/i });
			expect(button).toBeDisabled();
			expect(button.getAttribute("aria-disabled")).toBe("true");
		});

		it("shows the orders-paused notice (title + contact e-mail)", () => {
			render(<CartSheetFooter {...createProps({ hasStockIssues: false })} />);
			expect(screen.getByText("Le site est actuellement en pause.")).toBeInTheDocument();
			const mailLink = screen.getByRole("link", { name: "synclune@gmail.com" });
			expect(mailLink).toHaveAttribute("href", "mailto:synclune@gmail.com");
		});

		it("takes precedence over the stock-issues state", () => {
			render(<CartSheetFooter {...createProps({ hasStockIssues: true })} />);
			const button = screen.getByRole("button", { name: /Passer commande/i });
			expect(button.getAttribute("aria-describedby")).toBe("orders-paused-hint");
		});
	});

	it("renders the sheet footer wrapper", () => {
		render(<CartSheetFooter {...createProps()} />);
		expect(screen.getByTestId("sheet-footer")).toBeInTheDocument();
	});

	it("renders the shipping fees hint with the rate from SHIPPING_RATES.FR", () => {
		render(<CartSheetFooter {...createProps()} />);
		// SHIPPING_RATES.FR.amount === 499 (4.99 €). The mocked formatEuro returns "4.99 €".
		expect(
			screen.getByText(/Frais postaux dès 4\.99 € — calculés à l'étape suivante/),
		).toBeInTheDocument();
	});

	it("does not render the discount line when no discount is applied", () => {
		render(<CartSheetFooter {...createProps()} />);
		expect(screen.queryByText(/^Réduction/)).not.toBeInTheDocument();
	});

	it("renders the discount line with the applied code label", () => {
		render(
			<CartSheetFooter
				{...createProps({ appliedDiscountCode: "SUMMER20", discountAmount: 500 })}
			/>,
		);
		expect(screen.getByText("Réduction (SUMMER20)")).toBeInTheDocument();
		expect(screen.getByText(/−5\.00 €/)).toBeInTheDocument();
	});

	it("does not render the discount line when discountAmount is zero", () => {
		render(
			<CartSheetFooter {...createProps({ appliedDiscountCode: "EMPTY", discountAmount: 0 })} />,
		);
		expect(screen.queryByText(/^Réduction/)).not.toBeInTheDocument();
	});
});
