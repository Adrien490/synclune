import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockGetSession, mockPostHogIdentify } = vi.hoisted(() => ({
	mockGetSession: vi.fn(),
	mockPostHogIdentify: vi.fn(),
}));

vi.mock("@/modules/auth/lib/get-current-session", () => ({
	getSession: mockGetSession,
}));

vi.mock("@/shared/components/posthog-identify", () => ({
	PostHogIdentify: (props: { user: unknown }) => {
		mockPostHogIdentify(props);
		return <div data-testid="posthog-identify" data-user={JSON.stringify(props.user)} />;
	},
}));

// Import AFTER mocks
import { PostHogIdentifyAsync } from "../posthog-identify-async";

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("PostHogIdentifyAsync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("passes user data when session exists", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "u-1", email: "test@example.com", name: "Alice" },
		});
		const element = await PostHogIdentifyAsync();
		const { unmount } = render(element);
		expect(mockPostHogIdentify).toHaveBeenCalledWith({
			user: { id: "u-1", email: "test@example.com", name: "Alice" },
		});
		unmount();
	});

	it("passes null user when session is null", async () => {
		mockGetSession.mockResolvedValue(null);
		const element = await PostHogIdentifyAsync();
		const { unmount } = render(element);
		expect(mockPostHogIdentify).toHaveBeenCalledWith({ user: null });
		unmount();
	});

	it("passes null user when getSession throws", async () => {
		mockGetSession.mockRejectedValue(new Error("network error"));
		const element = await PostHogIdentifyAsync();
		const { unmount } = render(element);
		expect(mockPostHogIdentify).toHaveBeenCalledWith({ user: null });
		unmount();
	});

	it("renders PostHogIdentify component", async () => {
		mockGetSession.mockResolvedValue(null);
		const element = await PostHogIdentifyAsync();
		const { unmount } = render(element);
		expect(screen.getByTestId("posthog-identify")).toBeInTheDocument();
		unmount();
	});

	it("only exposes id, email, name from session (not full user object)", async () => {
		mockGetSession.mockResolvedValue({
			user: { id: "u-1", email: "alice@example.com", name: "Alice", role: "ADMIN", secret: "x" },
		});
		const element = await PostHogIdentifyAsync();
		const { unmount } = render(element);
		const call = mockPostHogIdentify.mock.calls[0]?.[0];
		expect(call?.user).toEqual({ id: "u-1", email: "alice@example.com", name: "Alice" });
		expect(call?.user).not.toHaveProperty("role");
		expect(call?.user).not.toHaveProperty("secret");
		unmount();
	});
});
