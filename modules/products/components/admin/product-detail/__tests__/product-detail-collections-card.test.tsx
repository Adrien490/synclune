import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	FolderOpen: () => <svg data-testid="icon-folder-open" />,
	Star: () => <svg data-testid="icon-star" />,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { ProductDetailCollectionsCard } from "../product-detail-collections-card";

const makeEntry = (id: string, name: string, slug: string, isFeatured = false): any => ({
	id,
	addedAt: new Date(),
	isFeatured,
	collection: {
		id: `c-${id}`,
		name,
		slug,
		description: null,
		status: "PUBLIC",
	},
});

describe("ProductDetailCollectionsCard", () => {
	afterEach(cleanup);

	it("affiche un placeholder italique si aucune collection", () => {
		render(<ProductDetailCollectionsCard collections={[]} />);
		expect(screen.getByText("Ce produit n'appartient à aucune collection")).toBeInTheDocument();
	});

	it("rend chaque collection avec un lien vers la page admin", () => {
		render(
			<ProductDetailCollectionsCard
				collections={[
					makeEntry("e-1", "Été 2026", "ete-2026"),
					makeEntry("e-2", "Mariage", "mariage"),
				]}
			/>,
		);
		const link1 = screen.getByRole("link", { name: /Été 2026/ });
		expect(link1).toHaveAttribute("href", "/admin/catalogue/collections/ete-2026");
		const link2 = screen.getByRole("link", { name: /Mariage/ });
		expect(link2).toHaveAttribute("href", "/admin/catalogue/collections/mariage");
	});

	it("affiche le badge 'À la une' uniquement quand isFeatured", () => {
		render(
			<ProductDetailCollectionsCard
				collections={[
					makeEntry("e-1", "Été 2026", "ete-2026", true),
					makeEntry("e-2", "Mariage", "mariage", false),
				]}
			/>,
		);
		const badges = screen.getAllByTestId("badge");
		expect(badges).toHaveLength(1);
		expect(badges[0]).toHaveTextContent("À la une");
	});
});
