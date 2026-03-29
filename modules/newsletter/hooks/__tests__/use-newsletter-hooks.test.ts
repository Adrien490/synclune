import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockRefreshNewsletter, mockSubscribeToNewsletter, mockPosthogEvents } = vi.hoisted(() => ({
	mockRefreshNewsletter: vi.fn(),
	mockSubscribeToNewsletter: vi.fn(),
	mockPosthogEvents: {
		newsletterSubscribed: vi.fn(),
	},
}));

vi.mock("@/modules/newsletter/actions/refresh-newsletter", () => ({
	refreshNewsletter: mockRefreshNewsletter,
}));
vi.mock("@/modules/newsletter/actions/subscribe-to-newsletter", () => ({
	subscribeToNewsletter: mockSubscribeToNewsletter,
}));
vi.mock("@/shared/lib/posthog-events", () => ({
	posthogEvents: mockPosthogEvents,
}));

vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(),
		dismiss: vi.fn(),
		success: vi.fn(),
		error: vi.fn(),
		warning: vi.fn(),
	},
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { useRefreshNewsletter } from "../use-refresh-newsletter";
import { useSubscribeToNewsletter } from "../use-subscribe-to-newsletter";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Inscription confirmée" };
const ERROR = { status: "error" as const, message: "Erreur d'inscription" };

// ============================================================================
// useRefreshNewsletter
// ============================================================================

describe("useRefreshNewsletter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRefreshNewsletter.mockResolvedValue(SUCCESS);
	});

	it("returns action, isPending, and refresh", () => {
		const { result } = renderHook(() => useRefreshNewsletter());
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.refresh).toBe("function");
	});

	it("calls the refreshNewsletter action when refresh is invoked", async () => {
		const { result } = renderHook(() => useRefreshNewsletter());

		await act(async () => {
			result.current.refresh();
		});

		expect(mockRefreshNewsletter).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when refresh succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshNewsletter({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockRefreshNewsletter.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRefreshNewsletter({ onSuccess }));

		await act(async () => {
			result.current.refresh();
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useSubscribeToNewsletter
// ============================================================================

describe("useSubscribeToNewsletter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSubscribeToNewsletter.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useSubscribeToNewsletter());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with the success message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSubscribeToNewsletter({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Inscription confirmée");
	});

	it("calls posthogEvents.newsletterSubscribed when action succeeds", async () => {
		const { result } = renderHook(() => useSubscribeToNewsletter());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockPosthogEvents.newsletterSubscribed).toHaveBeenCalledTimes(1);
	});

	it("calls onError when action fails", async () => {
		mockSubscribeToNewsletter.mockResolvedValue(ERROR);
		const onError = vi.fn();
		const { result } = renderHook(() => useSubscribeToNewsletter({ onError }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onError).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockSubscribeToNewsletter.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSubscribeToNewsletter({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not call posthogEvents.newsletterSubscribed when action fails", async () => {
		mockSubscribeToNewsletter.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useSubscribeToNewsletter());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockPosthogEvents.newsletterSubscribed).not.toHaveBeenCalled();
	});
});
