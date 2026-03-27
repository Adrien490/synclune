import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a) => typeof a === "string" && a.length > 0)
			.join(" "),
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { PageHeaderSkeleton } from "../page-header-skeleton";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("PageHeaderSkeleton", () => {
	// ─── Element type ──────────────────────────────────────────────────────

	it("default variant renders a <header> element", () => {
		const { container } = render(<PageHeaderSkeleton />);

		expect(container.querySelector("header")).toBeInTheDocument();
	});

	it("compact variant renders a <div> (not a header)", () => {
		const { container } = render(<PageHeaderSkeleton variant="compact" />);

		expect(container.querySelector("header")).toBeNull();
		expect(container.querySelector("div")).toBeInTheDocument();
	});

	// ─── Accessibility ─────────────────────────────────────────────────────

	it("has role='status'", () => {
		render(<PageHeaderSkeleton />);

		expect(screen.getByRole("status")).toBeInTheDocument();
	});

	it("has aria-busy='true'", () => {
		render(<PageHeaderSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
	});

	it("has aria-label 'Chargement de l\u2019en-t\u00eate'", () => {
		render(<PageHeaderSkeleton />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement de l'en-tête");
	});

	it("compact variant also has role='status' and aria-busy='true'", () => {
		render(<PageHeaderSkeleton variant="compact" />);

		const el = screen.getByRole("status");
		expect(el).toBeInTheDocument();
		expect(el).toHaveAttribute("aria-busy", "true");
	});

	it("compact variant has aria-label 'Chargement de l\u2019en-t\u00eate'", () => {
		render(<PageHeaderSkeleton variant="compact" />);

		expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Chargement de l'en-tête");
	});

	// ─── Actions placeholder ───────────────────────────────────────────────

	it("renders action area when hasActions=true (default variant)", () => {
		const { container } = render(<PageHeaderSkeleton hasActions />);

		// The action div contains a h-9 w-32 placeholder
		const actionPlaceholders = container.querySelectorAll(".h-9.w-32");
		expect(actionPlaceholders.length).toBeGreaterThan(0);
	});

	it("does not render action area when hasActions=false (default)", () => {
		const { container } = render(<PageHeaderSkeleton />);

		const actionPlaceholders = container.querySelectorAll(".h-9.w-32");
		expect(actionPlaceholders.length).toBe(0);
	});

	it("renders action area when hasActions=true (compact variant)", () => {
		const { container } = render(<PageHeaderSkeleton variant="compact" hasActions />);

		const actionPlaceholders = container.querySelectorAll(".h-9.w-32");
		expect(actionPlaceholders.length).toBeGreaterThan(0);
	});

	// ─── Description placeholder ───────────────────────────────────────────

	it("renders description placeholder by default", () => {
		const { container } = render(<PageHeaderSkeleton />);

		// Description skeleton: h-5 w-96 (default) or h-5 w-72 (compact)
		const descPlaceholders = container.querySelectorAll(".h-5");
		expect(descPlaceholders.length).toBeGreaterThan(0);
	});

	it("hides description placeholder when hasDescription=false", () => {
		const { container } = render(<PageHeaderSkeleton hasDescription={false} />);

		// With hasDescription false, no h-5 description skeleton should appear
		// The only h-5 would be the breadcrumb placeholder (mobile), not description
		// Check that no description (w-96) placeholder exists
		const descPlaceholders = container.querySelectorAll(".h-5.w-96");
		expect(descPlaceholders.length).toBe(0);
	});

	// ─── Custom className ──────────────────────────────────────────────────

	it("applies custom className to the root element", () => {
		render(<PageHeaderSkeleton className="my-custom-class" />);

		expect(screen.getByRole("status")).toHaveClass("my-custom-class");
	});

	it("applies custom className to compact variant root element", () => {
		render(<PageHeaderSkeleton variant="compact" className="compact-custom" />);

		expect(screen.getByRole("status")).toHaveClass("compact-custom");
	});
});
