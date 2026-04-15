import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/item", () => ({
	ItemGroup: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-group">{children}</div>
	),
	Item: ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
		<div data-testid="item" style={style}>
			{children}
		</div>
	),
	ItemContent: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-content">{children}</div>
	),
	ItemActions: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="item-actions">{children}</div>
	),
}));

vi.mock("@/shared/components/ui/skeleton", () => ({
	SkeletonGroup: ({ children, label }: { children: React.ReactNode; label?: string }) => (
		<div data-testid="skeleton-group" aria-label={label}>
			{children}
		</div>
	),
	Skeleton: ({ shape, className }: { shape?: string; className?: string }) => (
		<div data-testid="skeleton" data-shape={shape} className={className} />
	),
}));

// ============================================================================
// COMPONENT IMPORT (after mocks)
// ============================================================================

import { AnnouncementsMobileListSkeleton } from "../announcements-mobile-list-skeleton";

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("AnnouncementsMobileListSkeleton", () => {
	// ─── Wrapper ──────────────────────────────────────────────────────────────

	describe("wrapper", () => {
		it("renders without error", () => {
			render(<AnnouncementsMobileListSkeleton />);
		});

		it("outer wrapper has md:hidden class", () => {
			const { container } = render(<AnnouncementsMobileListSkeleton />);
			const wrapper = container.firstChild as HTMLElement;
			expect(wrapper.className).toContain("md:hidden");
		});
	});

	// ─── SkeletonGroup ────────────────────────────────────────────────────────

	describe("SkeletonGroup", () => {
		it("renders the SkeletonGroup", () => {
			render(<AnnouncementsMobileListSkeleton />);
			expect(screen.getByTestId("skeleton-group")).toBeInTheDocument();
		});

		it("SkeletonGroup has correct accessible label", () => {
			render(<AnnouncementsMobileListSkeleton />);
			expect(screen.getByTestId("skeleton-group")).toHaveAttribute(
				"aria-label",
				"Chargement des annonces",
			);
		});
	});

	// ─── Skeleton items ───────────────────────────────────────────────────────

	describe("skeleton items", () => {
		it("renders exactly 3 skeleton items", () => {
			render(<AnnouncementsMobileListSkeleton />);
			expect(screen.getAllByTestId("item")).toHaveLength(3);
		});

		it("renders ItemGroup containing all items", () => {
			render(<AnnouncementsMobileListSkeleton />);
			const group = screen.getByTestId("item-group");
			expect(group).toContainElement(screen.getAllByTestId("item")[0]!);
		});

		it("renders skeletons inside each item", () => {
			render(<AnnouncementsMobileListSkeleton />);
			// Each item has 3 skeletons: message (rounded) + badge (rounded) + date (text) + action (rounded)
			// Total: at least 3 skeletons per item × 3 items = 9+
			expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(9);
		});

		it("renders ItemActions with skeleton in each item", () => {
			render(<AnnouncementsMobileListSkeleton />);
			expect(screen.getAllByTestId("item-actions")).toHaveLength(3);
		});

		it("applies staggered animation delays to items", () => {
			render(<AnnouncementsMobileListSkeleton />);
			const items = screen.getAllByTestId("item");
			expect(items[0]).toHaveStyle("animation-delay: 0ms");
			expect(items[1]).toHaveStyle("animation-delay: 100ms");
			expect(items[2]).toHaveStyle("animation-delay: 200ms");
		});
	});

	// ─── Skeleton shapes ──────────────────────────────────────────────────────

	describe("skeleton shapes", () => {
		it("renders rounded skeletons for title and action areas", () => {
			render(<AnnouncementsMobileListSkeleton />);
			const rounded = screen
				.getAllByTestId("skeleton")
				.filter((el) => el.getAttribute("data-shape") === "rounded");
			// Each item has at least 2 rounded (message + badge) + 1 action rounded
			expect(rounded.length).toBeGreaterThanOrEqual(3);
		});

		it("renders text skeletons for description area", () => {
			render(<AnnouncementsMobileListSkeleton />);
			const text = screen
				.getAllByTestId("skeleton")
				.filter((el) => el.getAttribute("data-shape") === "text");
			// 1 text skeleton per item (date) × 3 items
			expect(text.length).toBe(3);
		});
	});
});
