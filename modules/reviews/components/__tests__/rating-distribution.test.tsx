import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
	usePathname: () => "/creations/bague",
	useSearchParams: () => ({
		get: (key: string) => (key === "ratingFilter" ? null : null),
		toString: () => "",
	}),
}));

vi.mock("@/shared/components/ui/progress", () => ({
	Progress: ({
		value,
		"aria-hidden": ariaHidden,
	}: {
		value?: number;
		className?: string;
		"aria-hidden"?: boolean;
	}) => <div data-testid="progress" data-value={value} aria-hidden={ariaHidden} />,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		variant,
		size,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		variant?: string;
		size?: string;
	}) => (
		<button onClick={onClick} disabled={disabled} data-variant={variant} data-size={size}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("lucide-react", () => ({
	X: () => <svg data-testid="icon-x" />,
}));

import { RatingDistribution } from "../rating-distribution";
import type { RatingDistribution as RatingDistributionType } from "@/modules/reviews/types/review.types";

// ============================================================================
// HELPERS
// ============================================================================

function createDistribution(): RatingDistributionType[] {
	return [
		{ rating: 5, count: 50, percentage: 50 },
		{ rating: 4, count: 30, percentage: 30 },
		{ rating: 3, count: 10, percentage: 10 },
		{ rating: 2, count: 5, percentage: 5 },
		{ rating: 1, count: 5, percentage: 5 },
	];
}

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("RatingDistribution", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without error", () => {
		render(<RatingDistribution distribution={createDistribution()} />);
		expect(screen.getByRole("group", { name: "Filtrer par note" })).toBeInTheDocument();
	});

	it("renders a button for each rating", () => {
		render(<RatingDistribution distribution={createDistribution()} />);
		const buttons = screen
			.getAllByRole("button")
			.filter((b) => b.getAttribute("aria-label")?.includes("Filtrer par"));
		expect(buttons.length).toBe(5);
	});

	it("renders button with correct aria-label for 5-star rating", () => {
		render(<RatingDistribution distribution={createDistribution()} />);
		expect(
			screen.getByRole("button", { name: "Filtrer par 5 étoiles (50 avis)" }),
		).toBeInTheDocument();
	});

	it("renders button with correct aria-label for 1-star rating (singular)", () => {
		render(<RatingDistribution distribution={createDistribution()} />);
		expect(
			screen.getByRole("button", { name: "Filtrer par 1 étoile (5 avis)" }),
		).toBeInTheDocument();
	});

	it("renders a progress bar for each rating", () => {
		render(<RatingDistribution distribution={createDistribution()} />);
		const progressBars = screen.getAllByTestId("progress");
		expect(progressBars.length).toBe(5);
	});

	it("renders percentage values", () => {
		render(<RatingDistribution distribution={createDistribution()} />);
		expect(screen.getByText("50%")).toBeInTheDocument();
		expect(screen.getByText("30%")).toBeInTheDocument();
	});

	it("renders count values in parentheses", () => {
		render(<RatingDistribution distribution={createDistribution()} />);
		expect(screen.getByText("(50)")).toBeInTheDocument();
		expect(screen.getByText("(30)")).toBeInTheDocument();
	});

	it("disables buttons with 0 count", () => {
		const distribution: RatingDistributionType[] = [
			{ rating: 5, count: 10, percentage: 100 },
			{ rating: 4, count: 0, percentage: 0 },
			{ rating: 3, count: 0, percentage: 0 },
			{ rating: 2, count: 0, percentage: 0 },
			{ rating: 1, count: 0, percentage: 0 },
		];
		render(<RatingDistribution distribution={distribution} />);
		const fourStarButton = screen.getByRole("button", {
			name: "Filtrer par 4 étoiles (0 avis)",
		});
		expect(fourStarButton).toBeDisabled();
	});

	it("does not show 'Filtre actif' badge when no active filter", () => {
		render(<RatingDistribution distribution={createDistribution()} />);
		expect(screen.queryByText("Filtre actif :")).toBeNull();
	});

	it("renders label text for ratings", () => {
		render(<RatingDistribution distribution={createDistribution()} />);
		expect(screen.getByText("5 étoiles")).toBeInTheDocument();
		expect(screen.getByText("1 étoile")).toBeInTheDocument();
	});
});
