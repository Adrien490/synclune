import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	ArrowLeft: () => <svg data-testid="icon-arrow-left" />,
	Ellipsis: () => <svg data-testid="icon-ellipsis" />,
	Pencil: () => <svg data-testid="icon-pencil" />,
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
	}: {
		children: React.ReactNode;
		variant?: string;
		className?: string;
	}) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		asChild,
		"aria-label": ariaLabel,
	}: {
		children: React.ReactNode;
		asChild?: boolean;
		"aria-label"?: string;
		size?: string;
		variant?: string;
		className?: string;
	}) =>
		asChild ? (
			<>{children}</>
		) : (
			<button type="button" aria-label={ariaLabel}>
				{children}
			</button>
		),
}));

vi.mock("@/shared/components/responsive-action-menu", () => ({
	ResponsiveActionMenu: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="actions-menu">{children}</div>
	),
	ResponsiveActionMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	ResponsiveActionMenuContent: ({
		title,
		sections,
	}: {
		title: string;
		description?: string;
		sections: Array<{ key: string; items: Array<{ key: string; label: string }> }>;
	}) => (
		<div data-testid="actions-menu-content" data-title={title}>
			{sections.map((s) =>
				s.items.map((it) => (
					<span key={`${s.key}-${it.key}`} data-action-key={it.key}>
						{it.label}
					</span>
				)),
			)}
		</div>
	),
}));

vi.mock("../../../../hooks/use-product-actions", () => ({
	useProductActions: ({
		productSlug,
	}: {
		productId: string;
		productSlug: string;
		productTitle: string;
		productStatus: string;
	}) => ({
		sections: [
			{
				key: "manage",
				items: [
					{
						key: "edit",
						label: "Modifier",
						href: `/admin/catalogue/produits/${productSlug}/modifier`,
					},
					{ key: "duplicate", label: "Dupliquer", onSelect: () => {} },
				],
			},
		],
	}),
}));

import { ProductDetailHeader } from "../product-detail-header";

const baseProduct = {
	id: "p-1",
	slug: "anneau-lune",
	title: "Anneau Lune",
	status: "PUBLIC" as const,
	createdAt: new Date("2026-01-01T10:00:00Z"),
	updatedAt: new Date("2026-01-02T10:00:00Z"),
};

describe("ProductDetailHeader", () => {
	afterEach(cleanup);

	it("rend le titre du produit en h1", () => {
		render(<ProductDetailHeader product={baseProduct} />);
		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toHaveTextContent("Anneau Lune");
	});

	it("expose un lien retour mobile vers la liste des produits", () => {
		render(<ProductDetailHeader product={baseProduct} />);
		const back = screen.getByRole("link", { name: /^Produits$/ });
		expect(back).toHaveAttribute("href", "/admin/catalogue/produits");
	});

	it("expose un bouton primaire 'Modifier' qui pointe vers /modifier", () => {
		render(<ProductDetailHeader product={baseProduct} />);
		const link = screen.getByRole("link", { name: /Modifier/ });
		expect(link).toHaveAttribute("href", "/admin/catalogue/produits/anneau-lune/modifier");
	});

	it("expose un trigger 'Plus d'actions'", () => {
		render(<ProductDetailHeader product={baseProduct} />);
		expect(screen.getByLabelText("Plus d'actions")).toBeInTheDocument();
	});

	it("transmet les sections du hook useProductActions au menu", () => {
		render(<ProductDetailHeader product={baseProduct} />);
		const content = screen.getByTestId("actions-menu-content");
		expect(content).toHaveAttribute("data-title", "Actions");
		expect(content.querySelector('[data-action-key="duplicate"]')).toBeInTheDocument();
	});

	it("affiche le badge status mobile (md:hidden) avec le label correspondant", () => {
		render(<ProductDetailHeader product={{ ...baseProduct, status: "DRAFT" }} />);
		const badge = screen.getByTestId("badge");
		expect(badge).toHaveTextContent("Brouillon");
		expect(badge).toHaveAttribute("data-variant", "secondary");
	});

	it("affiche une date de création relative dans la meta mobile", () => {
		render(<ProductDetailHeader product={baseProduct} />);
		// La meta mobile et la phrase desktop contiennent toutes deux 'Créé' ;
		// vérifier qu'au moins l'une des occurrences correspond à une date relative.
		const matches = screen.getAllByText(/Créé /);
		expect(matches.length).toBeGreaterThanOrEqual(1);
		expect(matches.some((node) => /il y a/.test(String(node.textContent)))).toBe(true);
	});
});
