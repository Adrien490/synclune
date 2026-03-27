import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("class-variance-authority", () => ({
	cva: () => () => "badge-classes",
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { VideoPlayBadge } from "../video-play-badge";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("VideoPlayBadge", () => {
	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("SVG play icon has aria-hidden='true'", () => {
		const { container } = render(<VideoPlayBadge />);

		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		expect(svg).toHaveAttribute("aria-hidden", "true");
	});

	// ============================================================================
	// LABEL DISPLAY
	// ============================================================================

	it("does not show 'Vidéo' text when showLabel is false (default)", () => {
		render(<VideoPlayBadge />);

		expect(screen.queryByText("Vidéo")).not.toBeInTheDocument();
	});

	it("shows 'Vidéo' text when showLabel is true", () => {
		render(<VideoPlayBadge showLabel />);

		expect(screen.getByText("Vidéo")).toBeInTheDocument();
	});

	// ============================================================================
	// DEFAULT RENDERING
	// ============================================================================

	it("renders without errors with default props", () => {
		const { container } = render(<VideoPlayBadge />);

		expect(container.firstChild).not.toBeNull();
	});
});
