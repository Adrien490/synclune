import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPostHog } = vi.hoisted(() => ({
	mockPostHog: {
		capture: vi.fn(),
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/lib/posthog", () => ({
	getPostHog: vi.fn(() => mockPostHog),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { getPostHog } from "@/shared/lib/posthog";
import { PostHogTrack } from "../posthog-track";

// ============================================================================
// SETUP
// ============================================================================

const mockGetPostHog = vi.mocked(getPostHog);

beforeEach(() => {
	vi.clearAllMocks();
	mockGetPostHog.mockReturnValue(mockPostHog as unknown as ReturnType<typeof getPostHog>);
});

afterEach(() => {
	cleanup();
});

// ============================================================================
// TESTS
// ============================================================================

describe("PostHogTrack", () => {
	// ─── capture ──────────────────────────────────────────────────────────

	it("calls capture with event and properties on mount", () => {
		render(<PostHogTrack event="page_viewed" properties={{ page: "/boutique" }} />);

		expect(mockPostHog.capture).toHaveBeenCalledOnce();
		expect(mockPostHog.capture).toHaveBeenCalledWith("page_viewed", { page: "/boutique" });
	});

	it("does not call capture again on re-render", () => {
		const { rerender } = render(
			<PostHogTrack event="page_viewed" properties={{ page: "/boutique" }} />,
		);
		expect(mockPostHog.capture).toHaveBeenCalledOnce();

		rerender(<PostHogTrack event="page_viewed" properties={{ page: "/boutique" }} />);
		expect(mockPostHog.capture).toHaveBeenCalledOnce();
	});

	// ─── null PostHog ──────────────────────────────────────────────────────

	it("does nothing when getPostHog returns null", () => {
		mockGetPostHog.mockReturnValue(null);

		render(<PostHogTrack event="checkout_started" />);

		expect(mockPostHog.capture).not.toHaveBeenCalled();
	});

	// ─── renders null ─────────────────────────────────────────────────────

	it("returns null (no DOM output)", () => {
		const { container } = render(<PostHogTrack event="order_confirmed" />);
		expect(container.innerHTML).toBe("");
	});

	// ─── properties optional ──────────────────────────────────────────────

	it("calls capture without properties when none provided", () => {
		render(<PostHogTrack event="product_viewed" />);

		expect(mockPostHog.capture).toHaveBeenCalledWith("product_viewed", undefined);
	});
});
