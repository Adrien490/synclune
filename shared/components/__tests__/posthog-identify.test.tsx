import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockPostHog } = vi.hoisted(() => ({
	mockPostHog: {
		identify: vi.fn(),
		reset: vi.fn(),
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
import { PostHogIdentify } from "../posthog-identify";

// ============================================================================
// SETUP
// ============================================================================

const mockGetPostHog = vi.mocked(getPostHog);

const testUser = {
	id: "user-1",
	email: "test@example.com",
	name: "Test User",
};

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

describe("PostHogIdentify", () => {
	// ─── identify ─────────────────────────────────────────────────────────

	it("calls identify with user data on mount", () => {
		render(<PostHogIdentify user={testUser} />);

		expect(mockPostHog.identify).toHaveBeenCalledOnce();
		expect(mockPostHog.identify).toHaveBeenCalledWith("user-1", {
			email: "test@example.com",
			name: "Test User",
		});
	});

	it("does not call identify again for same user.id on re-render", () => {
		const { rerender } = render(<PostHogIdentify user={testUser} />);
		expect(mockPostHog.identify).toHaveBeenCalledOnce();

		rerender(<PostHogIdentify user={testUser} />);
		expect(mockPostHog.identify).toHaveBeenCalledOnce();
	});

	it("calls identify with new user when user.id changes", () => {
		const { rerender } = render(<PostHogIdentify user={testUser} />);
		expect(mockPostHog.identify).toHaveBeenCalledOnce();

		const newUser = { id: "user-2", email: "other@example.com", name: "Other" };
		rerender(<PostHogIdentify user={newUser} />);

		expect(mockPostHog.identify).toHaveBeenCalledTimes(2);
		expect(mockPostHog.identify).toHaveBeenLastCalledWith("user-2", {
			email: "other@example.com",
			name: "Other",
		});
	});

	// ─── reset ────────────────────────────────────────────────────────────

	it("calls reset when user becomes null after being identified", () => {
		const { rerender } = render(<PostHogIdentify user={testUser} />);
		expect(mockPostHog.identify).toHaveBeenCalledOnce();

		rerender(<PostHogIdentify user={null} />);

		expect(mockPostHog.reset).toHaveBeenCalledOnce();
	});

	it("does not call reset when user was never identified", () => {
		render(<PostHogIdentify user={null} />);

		expect(mockPostHog.reset).not.toHaveBeenCalled();
	});

	// ─── null PostHog ──────────────────────────────────────────────────────

	it("does nothing when getPostHog returns null", () => {
		mockGetPostHog.mockReturnValue(null);

		render(<PostHogIdentify user={testUser} />);

		expect(mockPostHog.identify).not.toHaveBeenCalled();
		expect(mockPostHog.reset).not.toHaveBeenCalled();
	});

	// ─── null name ────────────────────────────────────────────────────────

	it("passes undefined for name when user.name is null", () => {
		render(<PostHogIdentify user={{ id: "user-1", email: "test@example.com", name: null }} />);

		expect(mockPostHog.identify).toHaveBeenCalledWith("user-1", {
			email: "test@example.com",
			name: undefined,
		});
	});

	// ─── renders null ─────────────────────────────────────────────────────

	it("renders null (no DOM output)", () => {
		const { container } = render(<PostHogIdentify user={testUser} />);
		expect(container.innerHTML).toBe("");
	});
});
