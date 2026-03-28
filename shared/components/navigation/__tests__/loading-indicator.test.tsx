import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockUseLinkStatus } = vi.hoisted(() => ({
	mockUseLinkStatus: vi.fn(),
}));

vi.mock("next/link", () => ({
	useLinkStatus: mockUseLinkStatus,
}));

// Import AFTER mocks
import { LoadingIndicator } from "../loading-indicator";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("LoadingIndicator", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the indicator span when navigation is pending", () => {
		mockUseLinkStatus.mockReturnValue({ pending: true });
		const { container } = render(<LoadingIndicator />);
		const span = container.querySelector("span");
		expect(span).toBeInTheDocument();
	});

	it("renders nothing when navigation is not pending", () => {
		mockUseLinkStatus.mockReturnValue({ pending: false });
		const { container } = render(<LoadingIndicator />);
		expect(container.firstChild).toBeNull();
	});

	it("indicator has aria-hidden=true", () => {
		mockUseLinkStatus.mockReturnValue({ pending: true });
		const { container } = render(<LoadingIndicator />);
		const span = container.querySelector("span");
		expect(span).toHaveAttribute("aria-hidden", "true");
	});

	it("indicator has animate-pulse class", () => {
		mockUseLinkStatus.mockReturnValue({ pending: true });
		const { container } = render(<LoadingIndicator />);
		const span = container.querySelector("span");
		expect(span?.className).toContain("animate-pulse");
	});
});
