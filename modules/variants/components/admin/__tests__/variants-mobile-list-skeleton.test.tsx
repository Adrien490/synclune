import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/components/ui/item", () => ({
	ItemGroup: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-group">{children}</div>
	),
	Item: ({ children }: { children: React.ReactNode }) => <div data-testid="item">{children}</div>,
	ItemContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-content">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	Skeleton: ({ shape, className }: { shape?: string; className?: string }) => (
		<div data-testid="skeleton" data-shape={shape} className={className} />
	),
	SkeletonGroup: ({ children, label }: { children: React.ReactNode; label: string }) => (
		<div data-testid="skeleton-group" aria-label={label}>
			{children}
		</div>
	),
}));

import { VariantsMobileListSkeleton } from "../variants-mobile-list-skeleton";

afterEach(cleanup);

describe("VariantsMobileListSkeleton", () => {
	it("renders SkeletonGroup with the loading label", () => {
		const { getByTestId } = render(<VariantsMobileListSkeleton />);
		expect(getByTestId("skeleton-group")).toHaveAttribute("aria-label", "Chargement des variantes");
	});

	it("renders 5 item placeholders", () => {
		const { getAllByTestId } = render(<VariantsMobileListSkeleton />);
		expect(getAllByTestId("item")).toHaveLength(5);
	});

	it("wrapper is hidden on md", () => {
		const { container } = render(<VariantsMobileListSkeleton />);
		expect(container.querySelector(".md\\:hidden")).toBeInTheDocument();
	});

	it("renders a 48px square image skeleton per row", () => {
		const { container } = render(<VariantsMobileListSkeleton />);
		expect(container.querySelectorAll(".size-12")).toHaveLength(5);
	});
});
