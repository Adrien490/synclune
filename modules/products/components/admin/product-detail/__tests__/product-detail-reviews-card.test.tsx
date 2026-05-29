import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("lucide-react", () => ({
	ArrowRight: () => <svg data-testid="icon-arrow-right" />,
	Star: () => <svg data-testid="icon-star" />,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
		asChild ? <>{children}</> : <button type="button">{children}</button>,
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => () => {},
}));

vi.mock("@/modules/reviews/components/review-summary-compact", () => ({
	ReviewSummaryCompact: ({ stats }: { stats: { averageRating: number; totalCount: number } }) => (
		<div data-testid="review-summary">
			{stats.averageRating} ({stats.totalCount})
		</div>
	),
}));

import { ProductDetailReviewsCard } from "../product-detail-reviews-card";

const makeStats = (overrides: Partial<{ totalCount: number; averageRating: number }>) =>
	({
		totalCount: overrides.totalCount ?? 0,
		averageRating: overrides.averageRating ?? 0,
		distribution: [
			{ rating: 5, count: 8, percentage: 80 },
			{ rating: 4, count: 2, percentage: 20 },
			{ rating: 3, count: 0, percentage: 0 },
			{ rating: 2, count: 0, percentage: 0 },
			{ rating: 1, count: 0, percentage: 0 },
		],
	}) as any;

describe("ProductDetailReviewsCard", () => {
	afterEach(cleanup);

	it("affiche un état vide quand aucun avis", () => {
		render(<ProductDetailReviewsCard stats={makeStats({ totalCount: 0 })} productTitle="Anneau" />);
		expect(screen.getByText("Aucun avis pour le moment")).toBeInTheDocument();
		expect(screen.queryByTestId("review-summary")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("affiche le résumé, la distribution et le lien modération quand il y a des avis", () => {
		render(
			<ProductDetailReviewsCard
				stats={makeStats({ totalCount: 10, averageRating: 4.8 })}
				productTitle="Anneau Lune"
			/>,
		);
		expect(screen.getByTestId("review-summary")).toHaveTextContent("4.8 (10)");
		const distribution = screen.getByLabelText("Répartition des notes");
		expect(distribution.querySelectorAll("li")).toHaveLength(5);
		expect(screen.getByLabelText("5 étoiles : 8 avis")).toBeInTheDocument();
		expect(screen.getByLabelText("1 étoile : 0 avis")).toBeInTheDocument();
	});

	it("construit le lien de modération filtré par titre produit (encodé)", () => {
		render(
			<ProductDetailReviewsCard
				stats={makeStats({ totalCount: 3, averageRating: 5 })}
				productTitle="Anneau Lune & Étoiles"
			/>,
		);
		const link = screen.getByRole("link", { name: /Gérer les avis/i });
		expect(link).toHaveAttribute(
			"href",
			`/admin/marketing/avis?search=${encodeURIComponent("Anneau Lune & Étoiles")}`,
		);
	});
});
