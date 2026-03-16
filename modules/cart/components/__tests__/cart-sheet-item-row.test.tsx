import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockOnClose } = vi.hoisted(() => ({
	mockOnClose: vi.fn(),
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		fill,
		...props
	}: {
		src: string;
		alt: string;
		fill?: boolean;
		[key: string]: unknown;
	}) => <img src={src} alt={alt} data-fill={fill ? "true" : undefined} {...props} />,
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		onClick,
		"aria-label": ariaLabel,
		className,
	}: {
		href: string;
		children: React.ReactNode;
		onClick?: () => void;
		"aria-label"?: string;
		className?: string;
	}) => (
		<a href={href} onClick={onClick} aria-label={ariaLabel} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		"aria-label": ariaLabel,
		variant,
	}: {
		children: React.ReactNode;
		"aria-label"?: string;
		variant?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} aria-label={ariaLabel}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({
	formatEuro: vi.fn((cents: number) => `${(cents / 100).toFixed(2)} €`),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: { LOW: 3 },
}));

vi.mock("../cart-item-quantity-selector", () => ({
	CartItemQuantitySelector: ({
		cartItemId,
		currentQuantity,
		maxQuantity,
	}: {
		cartItemId: string;
		currentQuantity: number;
		maxQuantity: number;
		isInactive: boolean;
	}) => (
		<div
			data-testid="quantity-selector"
			data-item-id={cartItemId}
			data-quantity={currentQuantity}
			data-max={maxQuantity}
		/>
	),
}));

vi.mock("../cart-item-remove-button", () => ({
	CartItemRemoveButton: ({
		cartItemId,
		itemName,
	}: {
		cartItemId: string;
		itemName: string;
		quantity: number;
	}) => (
		<button data-testid="remove-button" data-item-id={cartItemId}>
			Supprimer {itemName}
		</button>
	),
}));

vi.mock("@/modules/media/utils/media-utils", () => ({
	getVideoMimeType: vi.fn(() => "video/mp4"),
}));

vi.mock("@/modules/cart/services/cart-item.service", () => ({
	getCartItemSubtotal: vi.fn(
		(item: { priceAtAdd: number; quantity: number }) => item.priceAtAdd * item.quantity,
	),
	isCartItemOutOfStock: vi.fn(() => false),
	isCartItemInactive: vi.fn(() => false),
	hasCartItemIssue: vi.fn(() => false),
	hasCartItemDiscount: vi.fn(() => false),
	getCartItemDiscountPercent: vi.fn(() => 0),
	getCartItemPrimaryImage: vi.fn(
		(item: { sku: { images: unknown[] } }) => item.sku.images[0] ?? null,
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { CartSheetItemRow } from "../cart-sheet-item-row";
import type { CartItem } from "../../types/cart.types";
import * as cartItemService from "@/modules/cart/services/cart-item.service";

// ============================================================================
// TEST HELPERS
// ============================================================================

function resetServiceMocks() {
	vi.mocked(cartItemService.getCartItemSubtotal).mockImplementation(
		(item: { priceAtAdd: number; quantity: number }) => item.priceAtAdd * item.quantity,
	);
	vi.mocked(cartItemService.isCartItemOutOfStock).mockReturnValue(false);
	vi.mocked(cartItemService.isCartItemInactive).mockReturnValue(false);
	vi.mocked(cartItemService.hasCartItemIssue).mockReturnValue(false);
	vi.mocked(cartItemService.hasCartItemDiscount).mockReturnValue(false);
	vi.mocked(cartItemService.getCartItemDiscountPercent).mockReturnValue(0);
	vi.mocked(cartItemService.getCartItemPrimaryImage).mockImplementation(
		(item: any) => item.sku.images[0] ?? null,
	);
}

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	resetServiceMocks();
});

function createCartItem(overrides: Partial<Record<string, unknown>> = {}): CartItem {
	return {
		id: "item-1",
		quantity: 1,
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
			images: [
				{
					id: "img-1",
					url: "https://example.com/image.jpg",
					altText: "Bague Lune image",
					blurDataUrl: null,
					mediaType: "IMAGE",
					thumbnailUrl: null,
				},
			],
			color: null,
			material: null,
			size: null,
			product: {
				id: "prod-1",
				title: "Bague Lune",
				slug: "bague-lune",
				status: "PUBLIC",
			},
		},
		...overrides,
	} as unknown as CartItem;
}

// ============================================================================
// TESTS
// ============================================================================

describe("CartSheetItemRow", () => {
	it("renders the product title", () => {
		render(<CartSheetItemRow item={createCartItem()} />);
		expect(screen.getAllByText("Bague Lune").length).toBeGreaterThan(0);
	});

	it("renders the product image with correct alt text", () => {
		render(<CartSheetItemRow item={createCartItem()} />);
		const image = screen.getByAltText("Bague Lune image");
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
	});

	it("renders the link to the product page", () => {
		render(<CartSheetItemRow item={createCartItem()} />);
		const links = screen.getAllByRole("link");
		expect(links.some((link) => link.getAttribute("href") === "/creations/bague-lune")).toBe(true);
	});

	it("calls onClose when product link is clicked", () => {
		render(<CartSheetItemRow item={createCartItem()} onClose={mockOnClose} />);
		const links = screen.getAllByRole("link");
		links[0]!.click();
		expect(mockOnClose).toHaveBeenCalled();
	});

	it("renders formatted price", () => {
		render(<CartSheetItemRow item={createCartItem({ priceAtAdd: 2500, quantity: 1 })} />);
		expect(screen.getByText("25.00 €")).toBeInTheDocument();
	});

	it("renders quantity selector when inventory > 1", () => {
		render(<CartSheetItemRow item={createCartItem()} />);
		expect(screen.getByTestId("quantity-selector")).toBeInTheDocument();
	});

	it("renders remove button", () => {
		render(<CartSheetItemRow item={createCartItem()} />);
		expect(screen.getByTestId("remove-button")).toBeInTheDocument();
	});

	it("shows 'Rupture' badge when item is out of stock", () => {
		vi.mocked(cartItemService.isCartItemOutOfStock).mockReturnValue(true);
		vi.mocked(cartItemService.hasCartItemIssue).mockReturnValue(true);
		render(<CartSheetItemRow item={createCartItem()} />);
		expect(screen.getByText("Rupture")).toBeInTheDocument();
	});

	it("shows 'Indisponible' badge when item is inactive", () => {
		vi.mocked(cartItemService.isCartItemInactive).mockReturnValue(true);
		vi.mocked(cartItemService.hasCartItemIssue).mockReturnValue(true);
		render(<CartSheetItemRow item={createCartItem()} />);
		expect(screen.getByText("Indisponible")).toBeInTheDocument();
	});

	it("renders color attribute when present", () => {
		const item = createCartItem({
			sku: {
				...(createCartItem().sku as Record<string, unknown>),
				color: { name: "Or", hex: "#FFD700" },
			},
		});
		render(<CartSheetItemRow item={item} />);
		expect(screen.getByText("Or")).toBeInTheDocument();
	});

	it("renders 'Dernière pièce !' when inventory is 1 and no issue", () => {
		const item = createCartItem({
			sku: {
				...(createCartItem().sku as Record<string, unknown>),
				inventory: 1,
			},
		});
		render(<CartSheetItemRow item={item} />);
		expect(screen.getByText("Dernière pièce !")).toBeInTheDocument();
	});

	it("renders fallback when no image is available", () => {
		vi.mocked(cartItemService.getCartItemPrimaryImage).mockReturnValue(null);
		render(<CartSheetItemRow item={createCartItem()} />);
		expect(screen.getByText("Pas d'image")).toBeInTheDocument();
	});
});
