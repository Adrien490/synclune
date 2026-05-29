import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	AlertTriangle: () => <svg data-testid="icon-alert-triangle" />,
	ArrowRight: () => <svg data-testid="icon-arrow-right" />,
	LayoutList: () => <svg data-testid="icon-layout-list" />,
	Plus: () => <svg data-testid="icon-plus" />,
	Star: ({ "aria-label": ariaLabel }: { "aria-label"?: string }) => (
		<svg data-testid="icon-star" aria-label={ariaLabel} />
	),
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

type SkuInput = {
	priceInclTax: number;
	compareAtPrice?: number | null;
	inventory: number;
	isDefault?: boolean;
	color?: { name: string } | null;
	material?: { name: string } | null;
	size?: string | null;
	sku?: string;
};

const makeProduct = (skus: Array<SkuInput>) =>
	({
		id: "p-1",
		slug: "anneau-lune",
		title: "Anneau Lune",
		description: null,
		status: "PUBLIC" as const,
		createdAt: new Date(),
		updatedAt: new Date(),
		type: null,
		skus: skus.map((s, i) => ({
			id: `sku-${i}`,
			sku: s.sku ?? `SKU-${i}`,
			priceInclTax: s.priceInclTax,
			compareAtPrice: s.compareAtPrice ?? null,
			inventory: s.inventory,
			isDefault: s.isDefault ?? i === 0,
			colors: s.color ? [{ color: s.color, position: 0 }] : [],
			materials: s.material ? [{ material: s.material, position: 0 }] : [],
			size: s.size ?? null,
		})),
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
		// Plusieurs badges peuvent porter aria-label="0 en stock" (total + per-SKU)
		// → vérifier qu'au moins un a la variante destructive
		const stockBadges = screen.getAllByLabelText("0 en stock");
		expect(stockBadges.length).toBeGreaterThanOrEqual(1);
		expect(stockBadges.some((b) => b.getAttribute("data-variant") === "destructive")).toBe(true);
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

	it("affiche jusqu'à 3 variantes en preview avec leur stock individuel", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4500, inventory: 12, color: { name: "Or" }, size: "50" },
					{ priceInclTax: 4500, inventory: 5, color: { name: "Argent" }, size: "52" },
					{ priceInclTax: 4500, inventory: 3, color: { name: "Bronze" }, size: "54" },
					{ priceInclTax: 4500, inventory: 7, color: { name: "Cuivre" }, size: "56" },
				])}
			/>,
		);
		const preview = screen.getByLabelText("Aperçu des variantes");
		expect(preview).toBeInTheDocument();
		const items = preview.querySelectorAll("li");
		expect(items).toHaveLength(3);
		expect(preview.textContent).toContain("Or · 50");
		expect(preview.textContent).toContain("Argent · 52");
	});

	it("affiche '+ N autres' quand il y a plus de 3 variantes", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4500, inventory: 1 },
					{ priceInclTax: 4500, inventory: 1 },
					{ priceInclTax: 4500, inventory: 1 },
					{ priceInclTax: 4500, inventory: 1 },
					{ priceInclTax: 4500, inventory: 1 },
				])}
			/>,
		);
		expect(screen.getByText(/\+ 2 autres variantes/)).toBeInTheDocument();
	});

	it("affiche l'alerte rupture si au moins une variante a un stock à 0", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4500, inventory: 10 },
					{ priceInclTax: 4500, inventory: 0 },
				])}
			/>,
		);
		expect(screen.getByText(/1 variante en rupture/)).toBeInTheDocument();
		expect(screen.getByTestId("icon-alert-triangle")).toBeInTheDocument();
	});

	it("n'affiche pas l'alerte rupture si aucune variante n'est à 0", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4500, inventory: 10 },
					{ priceInclTax: 4500, inventory: 5 },
				])}
			/>,
		);
		expect(screen.queryByText(/en rupture/)).not.toBeInTheDocument();
		expect(screen.queryByTestId("icon-alert-triangle")).not.toBeInTheDocument();
	});

	it("marque le SKU défaut avec une icône Star dans la preview", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{
						priceInclTax: 4500,
						inventory: 10,
						isDefault: true,
						color: { name: "Or" },
						size: "50",
					},
					{ priceInclTax: 4500, inventory: 5, color: { name: "Argent" }, size: "52" },
				])}
			/>,
		);
		const stars = screen.getAllByTestId("icon-star");
		// 1 occurrence dans la preview pour le SKU défaut (le bloc "Par défaut" historique a été retiré)
		expect(stars.length).toBeGreaterThanOrEqual(1);
	});

	it("affiche le badge 'Rupture' sur la variante out-of-stock dans la preview", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4500, inventory: 0, color: { name: "Or" }, size: "50" },
				])}
			/>,
		);
		const ruptureBadges = screen
			.getAllByTestId("badge")
			.filter((b) => /Rupture/.test(String(b.textContent)));
		expect(ruptureBadges.length).toBeGreaterThanOrEqual(1);
	});

	it("affiche un badge -X% sur une variante en promotion dans la preview", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{
						priceInclTax: 4000,
						compareAtPrice: 5000,
						inventory: 10,
						color: { name: "Or" },
						size: "50",
					},
				])}
			/>,
		);
		// -20% (1 - 4000/5000)
		expect(screen.getByLabelText("En promotion, -20%")).toHaveTextContent("-20%");
	});

	it("indique 'Promo' à côté du prix quand au moins une variante est en promotion", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4000, compareAtPrice: 5000, inventory: 10 },
					{ priceInclTax: 6000, inventory: 5 },
				])}
			/>,
		);
		expect(screen.getByLabelText(/1 variante en promotion/)).toBeInTheDocument();
	});

	it("n'affiche aucun badge promo quand compareAtPrice est absent ou inférieur au prix", () => {
		render(
			<ProductDetailSkusSummaryCard
				product={makeProduct([
					{ priceInclTax: 4500, inventory: 10 },
					{ priceInclTax: 4500, compareAtPrice: 4000, inventory: 5 },
				])}
			/>,
		);
		expect(screen.queryByLabelText(/en promotion/)).not.toBeInTheDocument();
	});
});
