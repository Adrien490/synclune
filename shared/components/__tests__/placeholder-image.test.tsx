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

vi.mock("@phosphor-icons/react/ssr", () => ({
	ImageIcon: ({
		className,
		"aria-hidden": ariaHidden,
	}: {
		className?: string;
		"aria-hidden"?: boolean | "true";
	}) => <svg data-testid="image-icon" className={className} aria-hidden={ariaHidden} />,
}));

// ============================================================================
// IMPORTS (after mocks)
// ============================================================================

import { PlaceholderImage } from "../placeholder-image";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("PlaceholderImage", () => {
	// ─── Without label ─────────────────────────────────────────────────────

	it("has aria-hidden='true' when no label is provided", () => {
		const { container } = render(<PlaceholderImage />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv).toHaveAttribute("aria-hidden", "true");
	});

	it("has no role attribute when no label is provided", () => {
		const { container } = render(<PlaceholderImage />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv).not.toHaveAttribute("role");
	});

	it("has no aria-label when no label is provided", () => {
		const { container } = render(<PlaceholderImage />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv).not.toHaveAttribute("aria-label");
	});

	// ─── With label ────────────────────────────────────────────────────────

	it("has role='img' when label is provided", () => {
		render(<PlaceholderImage label="Photo du produit" />);

		expect(screen.getByRole("img")).toBeInTheDocument();
	});

	it("has correct aria-label when label is provided", () => {
		render(<PlaceholderImage label="Photo du produit" />);

		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Photo du produit");
	});

	it("does not have aria-hidden when label is provided", () => {
		render(<PlaceholderImage label="Photo du produit" />);

		const img = screen.getByRole("img");
		expect(img).not.toHaveAttribute("aria-hidden");
	});

	// ─── Icon ──────────────────────────────────────────────────────────────

	it("ImageIcon always has aria-hidden='true'", () => {
		render(<PlaceholderImage />);

		const icon = screen.getByTestId("image-icon");
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});

	it("ImageIcon has aria-hidden='true' even when label is provided", () => {
		render(<PlaceholderImage label="Photo" />);

		const icon = screen.getByTestId("image-icon");
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});

	// ─── Custom className ──────────────────────────────────────────────────

	it("applies custom className to the outer div", () => {
		const { container } = render(<PlaceholderImage className="aspect-video" />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv.className).toContain("aspect-video");
	});

	// ─── preserveAspect ────────────────────────────────────────────────────

	it("applies aspect-square by default", () => {
		const { container } = render(<PlaceholderImage />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv.className).toContain("aspect-square");
	});

	it("omits aspect-square when preserveAspect is true (lets parent aspect take over without CLS conflict)", () => {
		const { container } = render(<PlaceholderImage preserveAspect />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv.className).not.toContain("aspect-square");
	});

	it("preserveAspect still honors custom className aspect override", () => {
		const { container } = render(<PlaceholderImage preserveAspect className="aspect-[4/3]" />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv.className).not.toContain("aspect-square");
		expect(outerDiv.className).toContain("aspect-[4/3]");
	});
});
