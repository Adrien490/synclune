import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockSignInEmail } = vi.hoisted(() => ({
	mockSignInEmail: vi.fn(),
}));

vi.mock("@/modules/auth/actions/sign-in-email", () => ({
	signInEmail: mockSignInEmail,
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

import { useSignInEmail } from "../use-sign-in-email";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "Connexion réussie" };
const ERROR_INVALID_CREDENTIALS = {
	status: "unauthorized" as const,
	message: "Email ou mot de passe incorrect",
};
const ERROR_GENERIC = {
	status: "error" as const,
	message: "Une erreur est survenue lors de la connexion",
};
const ERROR_EMAIL_NOT_VERIFIED = {
	status: "error" as const,
	message: "EMAIL_NOT_VERIFIED",
};

// ============================================================================
// Tests
// ============================================================================

describe("useSignInEmail", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSignInEmail.mockResolvedValue(SUCCESS);
	});

	// ──────────── Return shape ────────────

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useSignInEmail());

		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("does not return a form object (action-only hook)", () => {
		const { result } = renderHook(() => useSignInEmail());

		expect(result.current).not.toHaveProperty("form");
	});

	it("isPending starts as false", () => {
		const { result } = renderHook(() => useSignInEmail());

		expect(result.current.isPending).toBe(false);
	});

	// ──────────── Action state transitions ────────────

	it("state is undefined before any action is dispatched", () => {
		const { result } = renderHook(() => useSignInEmail());

		expect(result.current.state).toBeUndefined();
	});

	it("state is updated after action completes successfully", async () => {
		const { result } = renderHook(() => useSignInEmail());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});

	it("state reflects error when action returns invalid credentials", async () => {
		mockSignInEmail.mockResolvedValue(ERROR_INVALID_CREDENTIALS);
		const { result } = renderHook(() => useSignInEmail());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR_INVALID_CREDENTIALS);
	});

	it("state reflects error on generic failure", async () => {
		mockSignInEmail.mockResolvedValue(ERROR_GENERIC);
		const { result } = renderHook(() => useSignInEmail());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR_GENERIC);
	});

	it("state reflects email-not-verified error", async () => {
		mockSignInEmail.mockResolvedValue(ERROR_EMAIL_NOT_VERIFIED);
		const { result } = renderHook(() => useSignInEmail());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR_EMAIL_NOT_VERIFIED);
	});

	// ──────────── onSuccess callback ────────────

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSignInEmail({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action returns an error", async () => {
		mockSignInEmail.mockResolvedValue(ERROR_INVALID_CREDENTIALS);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSignInEmail({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not call onSuccess when action returns a generic error", async () => {
		mockSignInEmail.mockResolvedValue(ERROR_GENERIC);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSignInEmail({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options (no crash)", async () => {
		const { result } = renderHook(() => useSignInEmail());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockSignInEmail).toHaveBeenCalledTimes(1);
	});

	it("works with undefined options (no crash)", async () => {
		const { result } = renderHook(() => useSignInEmail(undefined));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockSignInEmail).toHaveBeenCalledTimes(1);
	});

	// ──────────── Toast suppression ────────────

	it("does not show a success toast (showSuccessToast: false)", async () => {
		const { toast } = await import("sonner");
		const { result } = renderHook(() => useSignInEmail());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(toast.success).not.toHaveBeenCalled();
	});

	it("does not show an error toast (showErrorToast: false)", async () => {
		const { toast } = await import("sonner");
		mockSignInEmail.mockResolvedValue(ERROR_INVALID_CREDENTIALS);
		const { result } = renderHook(() => useSignInEmail());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(toast.error).not.toHaveBeenCalled();
	});

	// ──────────── Multiple dispatches ────────────

	it("calls the action each time it is invoked", async () => {
		const { result } = renderHook(() => useSignInEmail());

		await act(async () => {
			result.current.action(new FormData());
		});
		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockSignInEmail).toHaveBeenCalledTimes(2);
	});

	// ──────────── onSuccess receives the result from createToastCallbacks ────────────

	it("onSuccess is called once per successful action", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSignInEmail({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});
		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(2);
	});
});
