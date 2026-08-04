import type * as MediaUtils from "@/modules/media/utils/media-utils";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/long-press-menu-link", () => ({
	LongPressMenuLink: ({
		href,
		ariaLabel,
		children,
		className,
	}: {
		href: string;
		ariaLabel: string;
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href={href} aria-label={ariaLabel} className={className}>
			{children}
		</a>
	),
}));

vi.mock("@/modules/skus/hooks/use-sku-actions", () => ({
	useSkuActions: () => ({ sections: [] }),
}));

vi.mock("@/shared/constants/cache-tags", () => ({
	STOCK_THRESHOLDS: { CRITICAL: 1, LOW: 3, NORMAL_MAX: 50 },
}));

// Mock PARTIEL : `resolveMediaThumbSrc` est une fonction pure dont on veut le
// comportement réel (un mock total la rendrait `undefined` et masquerait la
// résolution poster/url — exactement le défaut que ce composant corrige).
vi.mock("@/modules/media/utils/media-utils", async (importOriginal) => ({
	...(await importOriginal<typeof MediaUtils>()),
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
	Item: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
		<div data-testid="item" {...rest}>
			{children}
		</div>
	),
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

const pendingContextMock = vi.hoisted(() => ({
	current: null as null | {
		isPending: (id: string) => boolean;
		pendingKind: string | null;
	},
}));

vi.mock("@/shared/contexts/admin-list-pending-context", () => ({
	useAdminListPendingContextOptional: () => pendingContextMock.current,
}));

vi.mock("@phosphor-icons/react/ssr", () => ({
	PackageIcon: () => <svg data-testid="icon-package" />,
	DotsThreeVerticalIcon: () => <svg data-testid="icon-more-vertical" />,
	SpinnerIcon: (props: Record<string, unknown>) => <svg data-testid="icon-loader" {...props} />,
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

afterEach(() => {
	pendingContextMock.current = null;
	cleanup();
});

describe("SkuMobileItem", () => {
	it("renders the SKU code in description (not as title)", () => {
		render(<SkuMobileItem sku={createSku({ sku: "REF-999" })} productSlug="bague-lune" />);
		expect(screen.getByText("REF-999")).toBeInTheDocument();
	});

	it("renders composed title from color · material · size", () => {
		render(
			<SkuMobileItem
				sku={createSku({
					colors: [
						{
							colorId: "c-1",
							position: 0,
							color: { id: "c-1", name: "Or rose", hex: "#FFD700", slug: "or-rose" },
						},
					],
					materials: [
						{
							materialId: "m-1",
							position: 0,
							material: { id: "m-1", name: "Argent", slug: "argent" },
						},
					],
					size: "52mm",
				})}
				productSlug="bague-lune"
			/>,
		);
		expect(screen.getByText("Or rose · Argent · 52mm")).toBeInTheDocument();
	});

	it("renders 'Variante principale' fallback when default sku has no attributes", () => {
		render(
			<SkuMobileItem
				sku={createSku({ isDefault: true, size: null, sku: "REF-MAIN" })}
				productSlug="bague-lune"
			/>,
		);
		expect(screen.getByText("Variante principale")).toBeInTheDocument();
		expect(screen.getByText("REF-MAIN")).toBeInTheDocument();
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
					colors: [
						{
							colorId: "c-1",
							position: 0,
							color: { id: "c-1", name: "Or", hex: "#FFD700", slug: "or" },
						},
					],
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
							thumbnailUrl: null,
							blurDataUrl: null,
							width: null,
							height: null,
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

	it("navigue vers la page détail variante au tap (Link href)", () => {
		render(
			<SkuMobileItem
				sku={createSku({ id: "sku-42", sku: "REF-42", size: "M" })}
				productSlug="produit-x"
			/>,
		);
		const link = screen.getByLabelText("Variante : M");
		expect(link.tagName).toBe("A");
		expect(link).toHaveAttribute("href", "/admin/catalogue/produits/produit-x/variantes/sku-42");
	});

	it("exposes accessible aria-label from composed title", () => {
		render(
			<SkuMobileItem
				sku={createSku({ id: "sku-99", sku: "REF-99", isDefault: true })}
				productSlug="bague-lune"
			/>,
		);
		expect(screen.getByLabelText("Variante : Variante principale")).toBeInTheDocument();
	});

	it("expose aria-roledescription=carte variante sur le wrapper Item", () => {
		render(<SkuMobileItem sku={createSku()} productSlug="bague-lune" />);
		expect(screen.getByTestId("item")).toHaveAttribute("aria-roledescription", "carte variante");
	});
});
