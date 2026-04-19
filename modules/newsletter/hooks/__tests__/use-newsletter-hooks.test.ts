import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockRefreshNewsletter,
	mockSubscribeToNewsletter,
	mockAdminBulkDeleteNewsletterSubscribers,
	mockAdminBulkUnsubscribeNewsletter,
	mockAdminDeleteNewsletterSubscriber,
	mockAdminUnsubscribeNewsletter,
} = vi.hoisted(() => ({
	mockRefreshNewsletter: vi.fn(),
	mockSubscribeToNewsletter: vi.fn(),
	mockAdminBulkDeleteNewsletterSubscribers: vi.fn(),
	mockAdminBulkUnsubscribeNewsletter: vi.fn(),
	mockAdminDeleteNewsletterSubscriber: vi.fn(),
	mockAdminUnsubscribeNewsletter: vi.fn(),
}));

vi.mock("@/modules/newsletter/actions/refresh-newsletter", () => ({
	refreshNewsletter: mockRefreshNewsletter,
}));
vi.mock("@/modules/newsletter/actions/subscribe-to-newsletter", () => ({
	subscribeToNewsletter: mockSubscribeToNewsletter,
}));
vi.mock("@/modules/newsletter/actions/admin-bulk-delete-newsletter-subscribers", () => ({
	adminBulkDeleteNewsletterSubscribers: mockAdminBulkDeleteNewsletterSubscribers,
}));
vi.mock("@/modules/newsletter/actions/admin-bulk-unsubscribe-newsletter", () => ({
	adminBulkUnsubscribeNewsletter: mockAdminBulkUnsubscribeNewsletter,
}));
vi.mock("@/modules/newsletter/actions/admin-delete-newsletter-subscriber", () => ({
	adminDeleteNewsletterSubscriber: mockAdminDeleteNewsletterSubscriber,
}));
vi.mock("@/modules/newsletter/actions/admin-unsubscribe-newsletter", () => ({
	adminUnsubscribeNewsletter: mockAdminUnsubscribeNewsletter,
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
import { useAdminBulkDeleteNewsletterSubscribers } from "../use-admin-bulk-delete-newsletter-subscribers";
import { useAdminBulkUnsubscribeNewsletter } from "../use-admin-bulk-unsubscribe-newsletter";
import { useAdminDeleteNewsletterSubscriber } from "../use-admin-delete-newsletter-subscriber";
import { useAdminUnsubscribeNewsletter } from "../use-admin-unsubscribe-newsletter";

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
});

// ============================================================================
// useAdminBulkDeleteNewsletterSubscribers
// ============================================================================

describe("useAdminBulkDeleteNewsletterSubscribers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAdminBulkDeleteNewsletterSubscribers.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useAdminBulkDeleteNewsletterSubscribers());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAdminBulkDeleteNewsletterSubscribers({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockAdminBulkDeleteNewsletterSubscribers.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAdminBulkDeleteNewsletterSubscribers({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useAdminBulkDeleteNewsletterSubscribers());
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(mockAdminBulkDeleteNewsletterSubscribers).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useAdminBulkUnsubscribeNewsletter
// ============================================================================

describe("useAdminBulkUnsubscribeNewsletter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAdminBulkUnsubscribeNewsletter.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useAdminBulkUnsubscribeNewsletter());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAdminBulkUnsubscribeNewsletter({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockAdminBulkUnsubscribeNewsletter.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAdminBulkUnsubscribeNewsletter({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useAdminBulkUnsubscribeNewsletter());
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(mockAdminBulkUnsubscribeNewsletter).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useAdminDeleteNewsletterSubscriber
// ============================================================================

describe("useAdminDeleteNewsletterSubscriber", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAdminDeleteNewsletterSubscriber.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useAdminDeleteNewsletterSubscriber());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAdminDeleteNewsletterSubscriber({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockAdminDeleteNewsletterSubscriber.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAdminDeleteNewsletterSubscriber({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useAdminDeleteNewsletterSubscriber());
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(mockAdminDeleteNewsletterSubscriber).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useAdminUnsubscribeNewsletter
// ============================================================================

describe("useAdminUnsubscribeNewsletter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAdminUnsubscribeNewsletter.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useAdminUnsubscribeNewsletter());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAdminUnsubscribeNewsletter({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).toHaveBeenCalled();
	});

	it("does not call onSuccess when action fails", async () => {
		mockAdminUnsubscribeNewsletter.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useAdminUnsubscribeNewsletter({ onSuccess }));
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options", async () => {
		const { result } = renderHook(() => useAdminUnsubscribeNewsletter());
		await act(async () => {
			result.current.action(new FormData());
		});
		expect(mockAdminUnsubscribeNewsletter).toHaveBeenCalledTimes(1);
	});
});
