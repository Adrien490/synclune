import type React from "react";
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

vi.mock("lucide-react", () => ({
	Video: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="video-icon" {...props} />,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { MediaTypeBadge } from "../media-type-badge";

// ============================================================================
// SETUP
// ============================================================================

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("MediaTypeBadge", () => {
	// ============================================================================
	// NULL RENDERING
	// ============================================================================

	it("returns null for type='IMAGE'", () => {
		const { container } = render(<MediaTypeBadge type="IMAGE" />);

		expect(container.innerHTML).toBe("");
	});

	// ============================================================================
	// VIDEO RENDERING
	// ============================================================================

	it("renders a visible element for type='VIDEO'", () => {
		const { container } = render(<MediaTypeBadge type="VIDEO" />);

		expect(container.innerHTML).not.toBe("");
	});

	it("displays the text 'VIDÉO'", () => {
		render(<MediaTypeBadge type="VIDEO" />);

		expect(screen.getByText("VIDÉO")).toBeInTheDocument();
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("has aria-label 'Type de média : vidéo'", () => {
		render(<MediaTypeBadge type="VIDEO" />);

		expect(screen.getByLabelText("Type de média : vidéo")).toBeInTheDocument();
	});

	it("Video icon has aria-hidden='true'", () => {
		render(<MediaTypeBadge type="VIDEO" />);

		const icon = screen.getByTestId("video-icon");
		expect(icon).toHaveAttribute("aria-hidden", "true");
	});
});
