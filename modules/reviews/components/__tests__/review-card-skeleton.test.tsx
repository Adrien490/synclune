import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { ReviewCardSkeleton } from "../review-card-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("ReviewCardSkeleton", () => {
	it("renders without error", () => {
		render(<ReviewCardSkeleton />);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
	});

	it("renders as an article", () => {
		render(<ReviewCardSkeleton />);
		expect(screen.getByRole("article")).toBeInTheDocument();
	});

	it("does not render media skeletons by default", () => {
		render(<ReviewCardSkeleton />);
		// default showMedia=false — should have fewer skeletons than with showMedia=true
		const defaultCount = screen.getAllByTestId("skeleton").length;
		cleanup();
		render(<ReviewCardSkeleton showMedia={true} />);
		const withMediaCount = screen.getAllByTestId("skeleton").length;
		expect(withMediaCount).toBeGreaterThan(defaultCount);
	});

	it("renders response skeletons when showResponse is true", () => {
		render(<ReviewCardSkeleton showResponse={false} />);
		const withoutCount = screen.getAllByTestId("skeleton").length;
		cleanup();
		render(<ReviewCardSkeleton showResponse={true} />);
		const withResponseCount = screen.getAllByTestId("skeleton").length;
		expect(withResponseCount).toBeGreaterThan(withoutCount);
	});

	it("accepts className prop", () => {
		const { container } = render(<ReviewCardSkeleton className="custom-class" />);
		expect(container.querySelector(".custom-class")).not.toBeNull();
	});
});
