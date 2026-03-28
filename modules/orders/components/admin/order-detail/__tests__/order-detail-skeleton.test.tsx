import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
}));

vi.mock("@/shared/components/ui/card", () => ({
	Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
	CardContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="card-content">{children}</div>
	),
	CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div data-testid="card-header" className={className}>
			{children}
		</div>
	),
}));

import { OrderDetailSkeleton } from "../order-detail-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("OrderDetailSkeleton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders without crashing", () => {
		const { container } = render(<OrderDetailSkeleton />);
		expect(container.firstChild).toBeInTheDocument();
	});

	it("renders multiple skeleton elements", () => {
		render(<OrderDetailSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThan(10);
	});

	it("renders multiple card elements for the detail sections", () => {
		render(<OrderDetailSkeleton />);
		const cards = screen.getAllByTestId("card");
		expect(cards.length).toBeGreaterThanOrEqual(4);
	});

	it("renders card headers", () => {
		render(<OrderDetailSkeleton />);
		const cardHeaders = screen.getAllByTestId("card-header");
		expect(cardHeaders.length).toBeGreaterThan(0);
	});

	it("renders card content sections", () => {
		render(<OrderDetailSkeleton />);
		const cardContents = screen.getAllByTestId("card-content");
		expect(cardContents.length).toBeGreaterThan(0);
	});
});
