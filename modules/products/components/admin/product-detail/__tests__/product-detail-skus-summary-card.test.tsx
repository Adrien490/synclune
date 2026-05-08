import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	ArrowRight: () => <svg data-testid="icon-arrow-right" />,
	LayoutList: () => <svg data-testid="icon-layout-list" />,
	Star: () => <svg data-testid="icon-star" />,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({
		children,
		variant,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		variant: string;
		"aria-label"?: string;
	}) => (
		<span data-testid="badge" data-variant={variant} aria-label={ariaLabel}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		className,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		className?: string;
		variant?: string;
	}) =>
		asChild ? (
			<>{children}</>
		) : (
			<button type="button" className={className}>
				{children}
			</button>
		),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { ProductDetailSkusSummaryCard } from "../product-detail-skus-summary-card";

const makeProduct = (skus: Array<{ priceInclTax: number; inventory: number }>) =>
	({
		id: "p-1",
		slug: "anneau-lune",
		title: "Anneau Lune",
		description: null,
		status: "PUBLIC" as const,
		createdAt: new Date(),
		updatedAt: new Date(),
		type: null,
		skus,
		collections: [],
	}) as any;

describe("ProductDetailSkusSummaryCard", () => {
	afterEach(cleanup);

	it("affiche le nombre de variantes et le stock total", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4500, inventory: 10 },
					{ priceInclTax: 5500, inventory: 5 },
				])}
			/>,
		);
		expect(screen.getByText("Variantes actives")).toBeInTheDocument();
		expect(screen.getByText("2")).toBeInTheDocument();
		expect(screen.getByText("15")).toBeInTheDocument();
	});

	it("affiche une fourchette de prix min – max", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4500, inventory: 10 },
					{ priceInclTax: 5500, inventory: 5 },
				])}
			/>,
		);
		expect(screen.getByText(/45,00\s*€\s*–\s*55,00\s*€/)).toBeInTheDocument();
	});

	it("affiche un seul prix si tous identiques", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4500, inventory: 10 },
					{ priceInclTax: 4500, inventory: 5 },
				])}
			/>,
		);
		expect(screen.getByText(/^45,00\s*€$/)).toBeInTheDocument();
	});

	it("affiche un tiret quand il n'y a aucune variante", () => {
		render(<ProductDetailSkusSummaryCard product={makeProduct([])} />);
		expect(screen.getByText("—")).toBeInTheDocument();
	});

	it("badge stock destructive si stock = 0", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([{ priceInclTax: 4500, inventory: 0 }])}
			/>,
		);
		expect(screen.getByLabelText("0 en stock")).toHaveAttribute("data-variant", "destructive");
	});

	it("contient le lien vers /variantes", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([{ priceInclTax: 4500, inventory: 10 }])}
			/>,
		);
		expect(screen.getByRole("link", { name: /Gérer les variantes/i })).toHaveAttribute(
			"href",
			"/admin/catalogue/produits/anneau-lune/variantes",
		);
	});
});
