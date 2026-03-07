import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockIsOpen, mockUseSheet, mockUseReducedMotion } = vi.hoisted(() => {
	const mockClose = vi.fn();
	const mockIsOpen = { value: true };
	return {
		mockIsOpen,
		mockUseSheet: vi.fn(() => ({ isOpen: mockIsOpen.value, close: mockClose })),
		mockUseReducedMotion: vi.fn(() => false),
	};
});

// ============================================================================
// MODULE MOCKS
// ============================================================================

// Mock sheet store
vi.mock("@/shared/providers/sheet-store-provider", () => ({
	useSheet: mockUseSheet,
}));

// Mock motion/react — render children statically
vi.mock("motion/react", () => ({
	AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	m: {
		div: ({
			children,
			className,
		}: {
			children: React.ReactNode;
			className?: string;
			[key: string]: unknown;
		}) => <div className={className}>{children}</div>,
	},
	useReducedMotion: mockUseReducedMotion,
}));

// Mock Sheet UI — render children in simplified wrappers
vi.mock("@/shared/components/ui/sheet", () => ({
	Sheet: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
	SheetContent: ({
		children,
		"aria-busy": ariaBusy,
		"data-pending": dataPending,
		className,
	}: {
		children: React.ReactNode;
		"aria-busy"?: boolean;
		"data-pending"?: string;
		className?: string;
	}) => (
		<div
			data-testid="sheet-content"
			aria-busy={ariaBusy}
			data-pending={dataPending}
			className={className}
		>
			{children}
		</div>
	),
	SheetHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-header" className={className}>
			{children}
		</div>
	),
	SheetTitle: ({ children }: { children: React.ReactNode }) => (
		<h2 data-testid="sheet-title">{children}</h2>
	),
	SheetDescription: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<p data-testid="sheet-description" className={className}>
			{children}
		</p>
	),
	SheetFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="sheet-footer" className={className}>
			{children}
		</div>
	),
}));

// Mock Empty
vi.mock("@/shared/components/ui/empty", () => ({
	Empty: ({ children }: { children: React.ReactNode }) => <div data-testid="empty">{children}</div>,
	EmptyActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
	EmptyHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyMedia: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	EmptyTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}));

// Mock Button
vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		...props
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		[key: string]: unknown;
	}) => {
		if (asChild) return <>{children}</>;
		return <button {...props}>{children}</button>;
	},
}));

// Mock next/link
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

// Mock ScrollFade
vi.mock("@/shared/components/scroll-fade", () => ({
	default: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="scroll-fade">{children}</div>
	),
}));

// Mock lucide-react
vi.mock("lucide-react", () => ({
	ShoppingBag: () => <svg data-testid="shopping-bag-icon" />,
}));

// Mock formatEuro
vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((cents: number) => `${(cents / 100).toFixed(2)} €`),
}));

// Mock sub-components
vi.mock("../cart-sheet-item-row", () => ({
	CartSheetItemRow: ({ item }: { item: { id: string; sku: { product: { title: string } } } }) => (
		<div data-testid={`cart-item-${item.id}`}>{item.sku.product.title}</div>
	),
}));

vi.mock("../remove-cart-item-alert-dialog", () => ({
	RemoveCartItemAlertDialog: () => <div data-testid="remove-alert-dialog" />,
}));

vi.mock("../cart-price-change-alert", () => ({
	CartPriceChangeAlert: () => <div data-testid="price-change-alert" />,
}));

vi.mock("../cart-sheet-footer", () => ({
	CartSheetFooter: ({
		totalItems,
		subtotal,
		isPending,
		hasStockIssues,
	}: {
		totalItems: number;
		subtotal: number;
		isPending: boolean;
		hasStockIssues: boolean;
	}) => (
		<div
			data-testid="cart-footer"
			data-total-items={totalItems}
			data-subtotal={subtotal}
			data-pending={isPending}
			data-stock-issues={hasStockIssues}
		/>
	),
}));

// Mock motion config
vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { spring: { list: { type: "spring", stiffness: 400, damping: 30, mass: 1 } } },
}));

// Mock fly-to-cart
vi.mock("../../lib/fly-to-cart", () => ({
	CART_TARGET_ATTR: "data-cart-target",
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartSheet } from "../cart-sheet";
import type { GetCartReturn } from "../../types/cart.types";

// ============================================================================
// TEST HELPERS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsOpen.value = true;
});

function createCartItem(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "item-1",
		quantity: 2,
		priceAtAdd: 2500,
		createdAt: new Date(),
		updatedAt: new Date(),
		sku: {
			id: "sku-1",
			sku: "SKU-001",
			priceInclTax: 2500,
			compareAtPrice: null,
			inventory: 10,
			isActive: true,
			product: {
				id: "prod-1",
				title: "Bague Lune",
				slug: "bague-lune",
				status: "PUBLIC",
			},
			images: [],
			color: null,
			material: null,
			size: null,
		},
		...overrides,
	};
}

function createCart(items: ReturnType<typeof createCartItem>[] = []): GetCartReturn {
	return {
		id: "cart-1",
		userId: "user-1",
		sessionId: null,
		expiresAt: new Date(Date.now() + 86400000),
		createdAt: new Date(),
		updatedAt: new Date(),
		items,
	} as unknown as GetCartReturn;
}

// ============================================================================
// TESTS
// ============================================================================

describe("CartSheet", () => {
	// ------------------------------------------------------------------
	// Empty state
	// ------------------------------------------------------------------
	describe("empty cart", () => {
		it("renders empty state when cart is null", () => {
			render(<CartSheet cart={null} />);
			expect(screen.getByText("Votre panier est vide !")).toBeInTheDocument();
		});

		it("renders empty state when cart has no items", () => {
			render(<CartSheet cart={createCart([])} />);
			expect(screen.getByText("Votre panier est vide !")).toBeInTheDocument();
		});

		it("renders 'Panier vide' in the screen reader live region", () => {
			render(<CartSheet cart={null} />);
			const liveRegion = screen.getByText("Panier vide");
			expect(liveRegion).toBeInTheDocument();
			expect(liveRegion.closest("[aria-live]")).toHaveAttribute("aria-live", "polite");
		});

		it("has role='status' on empty container", () => {
			render(<CartSheet cart={null} />);
			expect(screen.getByRole("status")).toBeInTheDocument();
		});

		it("renders shopping links", () => {
			render(<CartSheet cart={null} />);
			expect(screen.getByRole("link", { name: /Découvrir la boutique/i })).toHaveAttribute(
				"href",
				"/produits",
			);
			expect(screen.getByRole("link", { name: /Voir les collections/i })).toHaveAttribute(
				"href",
				"/collections",
			);
		});
	});

	// ------------------------------------------------------------------
	// With items
	// ------------------------------------------------------------------
	describe("cart with items", () => {
		const item1 = createCartItem({ id: "item-1", quantity: 2, priceAtAdd: 2500 });
		const item2 = createCartItem({
			id: "item-2",
			quantity: 1,
			priceAtAdd: 3500,
			sku: {
				...createCartItem().sku,
				id: "sku-2",
				product: {
					id: "prod-2",
					title: "Collier Étoile",
					slug: "collier-etoile",
					status: "PUBLIC",
				},
			},
		});
		const cart = createCart([item1, item2]);

		it("renders all cart items", () => {
			render(<CartSheet cart={cart} />);
			expect(screen.getByTestId("cart-item-item-1")).toBeInTheDocument();
			expect(screen.getByTestId("cart-item-item-2")).toBeInTheDocument();
		});

		it("shows total item count in the title", () => {
			render(<CartSheet cart={cart} />);
			// 2 + 1 = 3 items total
			expect(screen.getByText("(3)")).toBeInTheDocument();
		});

		it("announces count and subtotal in the live region", () => {
			render(<CartSheet cart={cart} />);
			// subtotal = (2 * 2500) + (1 * 3500) = 8500
			const liveRegion = screen.getByText(/3 articles dans le panier, sous-total 85\.00 €/);
			expect(liveRegion).toBeInTheDocument();
		});

		it("passes correct props to CartSheetFooter", () => {
			render(<CartSheet cart={cart} />);
			const footer = screen.getByTestId("cart-footer");
			expect(footer).toHaveAttribute("data-total-items", "3");
			expect(footer).toHaveAttribute("data-subtotal", "8500");
			expect(footer).toHaveAttribute("data-stock-issues", "false");
		});

		it("renders CartPriceChangeAlert", () => {
			render(<CartSheet cart={cart} />);
			expect(screen.getByTestId("price-change-alert")).toBeInTheDocument();
		});

		it("renders RemoveCartItemAlertDialog", () => {
			render(<CartSheet cart={cart} />);
			expect(screen.getByTestId("remove-alert-dialog")).toBeInTheDocument();
		});

		it("renders recommendations slot when provided", () => {
			render(
				<CartSheet
					cart={cart}
					recommendations={<div data-testid="recommendations">Recommandations</div>}
				/>,
			);
			expect(screen.getByTestId("recommendations")).toBeInTheDocument();
		});
	});

	// ------------------------------------------------------------------
	// Singular item count
	// ------------------------------------------------------------------
	describe("singular item count", () => {
		it("uses singular 'article' for 1 item", () => {
			const cart = createCart([createCartItem({ quantity: 1 })]);
			render(<CartSheet cart={cart} />);
			expect(screen.getByText(/1 article dans le panier/)).toBeInTheDocument();
		});
	});

	// ------------------------------------------------------------------
	// Stock issues
	// ------------------------------------------------------------------
	describe("stock issues", () => {
		it("renders stock alert when items have issues", () => {
			const outOfStockItem = createCartItem({
				id: "item-oos",
				quantity: 5,
				sku: {
					...createCartItem().sku,
					inventory: 0,
				},
			});
			const cart = createCart([outOfStockItem]);
			render(<CartSheet cart={cart} />);

			const alert = screen.getByRole("alert");
			expect(alert).toBeInTheDocument();
			expect(alert).toHaveAttribute("aria-label", "Problèmes de stock dans le panier");
			expect(screen.getByText("Ajustez votre panier pour continuer")).toBeInTheDocument();
		});

		it("passes hasStockIssues=true to footer", () => {
			const outOfStockItem = createCartItem({
				quantity: 5,
				sku: { ...createCartItem().sku, inventory: 0 },
			});
			const cart = createCart([outOfStockItem]);
			render(<CartSheet cart={cart} />);

			expect(screen.getByTestId("cart-footer")).toHaveAttribute("data-stock-issues", "true");
		});

		it("does not render stock alert when all items are available", () => {
			const cart = createCart([createCartItem()]);
			render(<CartSheet cart={cart} />);
			expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		});
	});

	// ------------------------------------------------------------------
	// Accessibility: aria-busy
	// ------------------------------------------------------------------
	describe("aria-busy on SheetContent", () => {
		it("sets aria-busy=false when not pending", () => {
			render(<CartSheet cart={createCart([createCartItem()])} />);
			expect(screen.getByTestId("sheet-content")).toHaveAttribute("aria-busy", "false");
		});
	});

	// ------------------------------------------------------------------
	// Sheet header
	// ------------------------------------------------------------------
	describe("header", () => {
		it("renders title 'Mon panier'", () => {
			render(<CartSheet cart={null} />);
			expect(screen.getByText("Mon panier")).toBeInTheDocument();
		});

		it("renders sr-only description", () => {
			render(<CartSheet cart={null} />);
			const description = screen.getByTestId("sheet-description");
			expect(description).toHaveTextContent("Gérez les articles de votre panier");
			expect(description).toHaveClass("sr-only");
		});

		it("does not show item count when cart is empty", () => {
			render(<CartSheet cart={null} />);
			const title = screen.getByTestId("sheet-title");
			expect(title.textContent).toBe("Mon panier");
		});
	});

	// ------------------------------------------------------------------
	// Inactive items
	// ------------------------------------------------------------------
	describe("inactive items", () => {
		it("treats inactive SKU as a stock issue", () => {
			const inactiveItem = createCartItem({
				sku: {
					...createCartItem().sku,
					isActive: false,
				},
			});
			const cart = createCart([inactiveItem]);
			render(<CartSheet cart={cart} />);

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByTestId("cart-footer")).toHaveAttribute("data-stock-issues", "true");
		});
	});
});
