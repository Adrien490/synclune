import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/components/ui/item", () => ({
	Item: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
	ItemActions: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ItemGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ className }: { className?: string }) => (
		<div data-testid="skeleton" className={className} />
	),
	SkeletonGroup: ({ children, label }: { children: React.ReactNode; label?: string }) => (
		<div aria-label={label}>{children}</div>
	),
}));

import { CustomizationsMobileListSkeleton } from "../customizations-mobile-list-skeleton";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("CustomizationsMobileListSkeleton", () => {
	it("renders without error", () => {
		render(<CustomizationsMobileListSkeleton />);
	});

	it("renders the accessible loading label", () => {
		render(<CustomizationsMobileListSkeleton />);
		expect(
			screen.getByLabelText("Chargement des demandes de personnalisation"),
		).toBeInTheDocument();
	});

	it("renders 5 skeleton rows", () => {
		render(<CustomizationsMobileListSkeleton />);
		expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(5);
	});
});
