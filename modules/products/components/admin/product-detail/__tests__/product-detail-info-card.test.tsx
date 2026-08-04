import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@phosphor-icons/react/ssr", () => ({
	InfoIcon: () => <svg data-testid="icon-info" />,
	CopyIcon: () => <svg data-testid="icon-copy" />,
}));

vi.mock("@/shared/components/ui/badge", () => ({
	Badge: ({ children, variant }: { children: React.ReactNode; variant: string }) => (
		<span data-testid="badge" data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
		<div data-testid="card" data-vt={style?.viewTransitionName}>
			{children}
		</div>
	),
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({ text, label }: { text: string; label: string }) => (
		<button type="button" data-testid="copy-button" data-text={text} data-label={label}>
			Copier
		</button>
	),
}));

vi.mock("@/shared/components/description-collapse", () => ({
	DescriptionCollapse: ({ text }: { text: string }) => (
		<p data-testid="description-collapse">{text}</p>
	),
}));

import { ProductDetailInfoCard } from "../product-detail-info-card";

const baseProduct = {
	id: "p-1",
	slug: "anneau-lune",
	title: "Anneau Lune",
	description: "Une description complète\nsur deux lignes",
	status: "PUBLIC" as const,
	createdAt: new Date("2026-01-01"),
	updatedAt: new Date("2026-01-02"),
	type: { id: "t-1", slug: "bagues", label: "Bagues", isActive: true },
	skus: [],
	collections: [],
};

describe("ProductDetailInfoCard", () => {
	afterEach(cleanup);

	it("affiche le statut PUBLIC avec le badge default", () => {
		render(<ProductDetailInfoCard product={baseProduct} />);
		const badge = screen.getByTestId("badge");
		expect(badge).toHaveTextContent("Public");
		expect(badge).toHaveAttribute("data-variant", "default");
	});

	it("affiche le slug et le type", () => {
		render(<ProductDetailInfoCard product={baseProduct} />);
		expect(screen.getByText("anneau-lune")).toBeInTheDocument();
		expect(screen.getByText("Bagues")).toBeInTheDocument();
	});

	it("affiche la description complète quand présente", () => {
		render(<ProductDetailInfoCard product={baseProduct} />);
		expect(screen.getByText(/Une description complète/)).toBeInTheDocument();
		expect(screen.getByText("Description")).toBeInTheDocument();
	});

	it("affiche un placeholder italique quand description manque", () => {
		const noDesc = { ...baseProduct, description: null };
		render(<ProductDetailInfoCard product={noDesc} />);
		expect(screen.getByText("Aucune description renseignée")).toBeInTheDocument();
	});

	it("masque la ligne Type quand product.type est null", () => {
		const noType = { ...baseProduct, type: null };
		render(<ProductDetailInfoCard product={noType} />);
		expect(screen.queryByText("Type")).not.toBeInTheDocument();
	});

	it("rend les 3 statuts avec leur libellé/variant", () => {
		const { rerender } = render(
			<ProductDetailInfoCard product={{ ...baseProduct, status: "DRAFT" }} />,
		);
		expect(screen.getByTestId("badge")).toHaveTextContent("Brouillon");
		expect(screen.getByTestId("badge")).toHaveAttribute("data-variant", "secondary");

		rerender(<ProductDetailInfoCard product={{ ...baseProduct, status: "ARCHIVED" }} />);
		expect(screen.getByTestId("badge")).toHaveTextContent("Archivé");
		expect(screen.getByTestId("badge")).toHaveAttribute("data-variant", "outline");
	});
});
