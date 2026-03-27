import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// IMPORTS (no mocks needed)
// ============================================================================

import SystemBanner from "../system-banner";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("SystemBanner", () => {
	// ─── Visibility ───────────────────────────────────────────────────────

	it("renders nothing when show=false", () => {
		const { container } = render(<SystemBanner show={false} />);

		expect(container.firstChild).toBeNull();
	});

	it("renders the banner when show=true (default)", () => {
		render(<SystemBanner />);

		expect(screen.getByText("Development Mode")).toBeInTheDocument();
	});

	// ─── Text ─────────────────────────────────────────────────────────────

	it("renders default text 'Development Mode'", () => {
		render(<SystemBanner />);

		expect(screen.getByText("Development Mode")).toBeInTheDocument();
	});

	it("renders custom text when provided", () => {
		render(<SystemBanner text="Staging Environment" />);

		expect(screen.getByText("Staging Environment")).toBeInTheDocument();
	});

	// ─── Color: hex vs class ───────────────────────────────────────────────

	it("applies inline backgroundColor style for hex color", () => {
		const { container } = render(<SystemBanner color="#ff0000" />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv.style.backgroundColor).toBe("rgb(255, 0, 0)");
	});

	it("does not apply inline style for non-hex color class", () => {
		const { container } = render(<SystemBanner color="bg-orange-500" />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv.style.backgroundColor).toBe("");
	});

	it("applies color class to outer div for non-hex color", () => {
		const { container } = render(<SystemBanner color="bg-orange-500" />);

		const outerDiv = container.firstChild as HTMLElement;
		expect(outerDiv.className).toContain("bg-orange-500");
	});

	it("applies inline backgroundColor to span for hex color", () => {
		render(<SystemBanner color="#00aaff" text="Test" />);

		const span = screen.getByText("Test");
		expect(span.style.backgroundColor).toBe("rgb(0, 170, 255)");
	});

	// ─── Size variants ─────────────────────────────────────────────────────

	it("applies xs size classes by default", () => {
		render(<SystemBanner text="Label" />);

		const span = screen.getByText("Label");
		expect(span.className).toContain("text-[10px]");
		expect(span.className).toContain("px-1");
		expect(span.className).toContain("py-0.5");
	});

	it("applies sm size classes when size='sm'", () => {
		render(<SystemBanner text="Label" size="sm" />);

		const span = screen.getByText("Label");
		expect(span.className).toContain("text-xs");
		expect(span.className).toContain("px-2");
	});

	it("applies md size classes when size='md'", () => {
		render(<SystemBanner text="Label" size="md" />);

		const span = screen.getByText("Label");
		expect(span.className).toContain("text-sm");
		expect(span.className).toContain("px-3");
		expect(span.className).toContain("py-1");
	});

	it("applies lg size classes when size='lg'", () => {
		render(<SystemBanner text="Label" size="lg" />);

		const span = screen.getByText("Label");
		expect(span.className).toContain("text-base");
		expect(span.className).toContain("px-4");
		expect(span.className).toContain("py-1.5");
	});
});
