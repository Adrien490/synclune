import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockOpen, mockHaptic } = vi.hoisted(() => ({
	mockOpen: vi.fn(),
	mockHaptic: vi.fn(),
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({ open: mockOpen, close: vi.fn(), isOpen: false, data: null }),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => mockHaptic,
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: { CRITICAL: 1, LOW: 3, NORMAL_MAX: 50 },
}));

vi.mock("@/modules/media/utils/media-utils", () => ({
	getVideoMimeType: () => "video/mp4",
}));

vi.mock("next/image", () => ({
	default: ({ src, alt, ...rest }: { src: string; alt: string } & Record<string, unknown>) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} data-testid="sku-image" {...rest} />
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		variant?: string;
		"aria-label"?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} aria-label={ariaLabel}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/item", () => ({
	Item: ({ children }: { children: React.ReactNode }) => <div data-testid="item">{children}</div>,
	ItemContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-content">{children}</div>
	),
	ItemTitle: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-title">{children}</div>
	),
	ItemDescription: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-description">{children}</div>
	),
}));

vi.mock("lucide-react", () => ({
	Package: () => <svg data-testid="icon-package" />,
}));

vi.mock("../sku-item-drawer", () => ({
	SKU_ITEM_DRAWER_ID: "sku-item-drawer",
}));

import { SkuMobileItem } from "../sku-mobile-item";

type Sku = Parameters<typeof SkuMobileItem>[0]["sku"];

function createSku(overrides: Partial<Sku> = {}): Sku {
	return {
		id: "sku-1",
		sku: "REF-001",
		productId: "p-1",
		priceInclTax: 4500,
		compareAtPrice: null,
		inventory: 12,
		isActive: true,
		isDefault: false,
		size: null,
		createdAt: new Date("2026-01-01T00:00:00Z"),
		updatedAt: new Date("2026-01-01T00:00:00Z"),
		product: {
			id: "p-1",
			slug: "bague-lune",
			title: "Bague Lune",
			description: null,
			status: "PUBLIC",
		},
		color: null,
		material: null,
		images: [],
		_count: { images: 0, orderItems: 0 },
		...overrides,
	} as Sku;
}

afterEach(cleanup);

describe("SkuMobileItem", () => {
	beforeEach(() => {
		mockOpen.mockClear();
		mockHaptic.mockClear();
	});

	it("renders the SKU code", () => {
		render(<SkuMobileItem sku={createSku({ sku: "REF-999" })} productSlug="bague-lune" />);
		expect(screen.getByText("REF-999")).toBeInTheDocument();
	});

	it("renders the formatted price", () => {
		render(<SkuMobileItem sku={createSku({ priceInclTax: 4500 })} productSlug="bague-lune" />);
		expect(screen.getByText(/45,00/)).toBeInTheDocument();
	});

	it("renders stock badge with success variant when stock normal", () => {
		render(<SkuMobileItem sku={createSku({ inventory: 12 })} productSlug="bague-lune" />);
		const stockBadge = screen.getByLabelText("12 en stock");
		expect(stockBadge).toHaveAttribute("data-variant", "success");
	});

	it("renders stock badge with warning variant when stock low", () => {
		render(<SkuMobileItem sku={createSku({ inventory: 2 })} productSlug="bague-lune" />);
		const stockBadge = screen.getByLabelText("Stock faible : 2 disponible(s)");
		expect(stockBadge).toHaveAttribute("data-variant", "warning");
	});

	it("renders stock badge with destructive variant when out of stock", () => {
		render(<SkuMobileItem sku={createSku({ inventory: 0 })} productSlug="bague-lune" />);
		const stockBadge = screen.getByLabelText("Stock épuisé");
		expect(stockBadge).toHaveAttribute("data-variant", "destructive");
	});

	it("renders 'Par défaut' badge when isDefault", () => {
		render(<SkuMobileItem sku={createSku({ isDefault: true })} productSlug="bague-lune" />);
		expect(screen.getByText("Par défaut")).toBeInTheDocument();
	});

	it("renders 'Inactif' badge when not active", () => {
		render(<SkuMobileItem sku={createSku({ isActive: false })} productSlug="bague-lune" />);
		expect(screen.getByText("Inactif")).toBeInTheDocument();
	});

	it("renders color name when color is set", () => {
		render(
			<SkuMobileItem
				sku={createSku({
					color: { id: "c-1", name: "Or", hex: "#FFD700", slug: "or" },
				})}
				productSlug="bague-lune"
			/>,
		);
		expect(screen.getByText("Or")).toBeInTheDocument();
	});

	it("renders Package fallback when no image", () => {
		render(<SkuMobileItem sku={createSku()} productSlug="bague-lune" />);
		expect(screen.getByTestId("icon-package")).toBeInTheDocument();
	});

	it("renders Image when primary image is set", () => {
		render(
			<SkuMobileItem
				sku={createSku({
					images: [
						{
							id: "img-1",
							url: "https://example.com/img.jpg",
							blurDataUrl: null,
							altText: null,
							isPrimary: true,
							mediaType: "IMAGE",
						},
					],
				})}
				productSlug="bague-lune"
			/>,
		);
		expect(screen.getByTestId("sku-image")).toHaveAttribute("src", "https://example.com/img.jpg");
	});

	it("calls haptic and opens drawer on tap", async () => {
		const user = userEvent.setup();
		render(<SkuMobileItem sku={createSku()} productSlug="bague-lune" />);
		await user.click(screen.getByRole("button", { name: /Ouvrir la fiche de la variante/ }));
		expect(mockHaptic).toHaveBeenCalledWith("selection");
		expect(mockOpen).toHaveBeenCalledTimes(1);
	});

	it("passes sku identifiers to drawer open payload", async () => {
		const user = userEvent.setup();
		render(
			<SkuMobileItem
				sku={createSku({ id: "sku-42", sku: "REF-42", isDefault: true })}
				productSlug="produit-x"
			/>,
		);
		await user.click(screen.getByRole("button", { name: /Ouvrir la fiche de la variante/ }));
		const payload = mockOpen.mock.calls[0]?.[0];
		expect(payload).toMatchObject({
			sku: {
				id: "sku-42",
				skuCode: "REF-42",
				productSlug: "produit-x",
				isDefault: true,
			},
		});
	});
});
