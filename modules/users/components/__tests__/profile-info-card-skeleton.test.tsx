import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} aria-hidden="true" />
	),
}));

vi.mock("lucide-react", () => ({
	User: ({ className }: { className?: string }) => (
		<svg data-testid="icon-user" className={className} />
	),
}));

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

import { ProfileInfoCardSkeleton } from "../profile-info-card-skeleton";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("ProfileInfoCardSkeleton", () => {
	it("renders a section element", () => {
		const { container } = render(<ProfileInfoCardSkeleton />);
		expect(container.querySelector("section")).not.toBeNull();
	});

	it("renders 'Profil' heading", () => {
		render(<ProfileInfoCardSkeleton />);
		expect(screen.getByRole("heading", { name: /Profil/i })).toBeInTheDocument();
	});

	it("renders a User icon", () => {
		render(<ProfileInfoCardSkeleton />);
		expect(screen.getByTestId("icon-user")).toBeInTheDocument();
	});

	it("renders multiple skeleton elements", () => {
		render(<ProfileInfoCardSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		expect(skeletons.length).toBeGreaterThanOrEqual(3);
	});

	it("renders skeleton with full width class for main field", () => {
		render(<ProfileInfoCardSkeleton />);
		const skeletons = screen.getAllByTestId("skeleton");
		const hasFullWidth = skeletons.some((s) => s.className.includes("w-full"));
		expect(hasFullWidth).toBe(true);
	});
});
