import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const {
	mockChangePassword,
	mockRequestPasswordReset,
	mockResendVerificationEmail,
	mockResetPassword,
	mockSignInSocial,
	mockSignUpEmail,
	mockLogout,
	mockRouterPush,
	mockRouterRefresh,
} = vi.hoisted(() => ({
	mockChangePassword: vi.fn(),
	mockRequestPasswordReset: vi.fn(),
	mockResendVerificationEmail: vi.fn(),
	mockResetPassword: vi.fn(),
	mockSignInSocial: vi.fn(),
	mockSignUpEmail: vi.fn(),
	mockLogout: vi.fn(),
	mockRouterPush: vi.fn(),
	mockRouterRefresh: vi.fn(),
}));

vi.mock("@/modules/auth/actions/change-password", () => ({
	changePassword: mockChangePassword,
}));
vi.mock("@/modules/auth/actions/request-password-reset", () => ({
	requestPasswordReset: mockRequestPasswordReset,
}));
vi.mock("@/modules/auth/actions/resend-verification-email", () => ({
	resendVerificationEmail: mockResendVerificationEmail,
}));
vi.mock("@/modules/auth/actions/reset-password", () => ({
	resetPassword: mockResetPassword,
}));
vi.mock("@/modules/auth/actions/sign-in-social", () => ({
	signInSocial: mockSignInSocial,
}));
vi.mock("@/modules/auth/actions/sign-up-email", () => ({
	signUpEmail: mockSignUpEmail,
}));
vi.mock("@/modules/auth/actions/logout", () => ({
	logout: mockLogout,
}));

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(() => ({
		push: mockRouterPush,
		refresh: mockRouterRefresh,
	})),
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

import { useChangePassword } from "../use-change-password";
import { useRequestPasswordReset } from "../use-request-password-reset";
import { useResendVerificationEmail } from "../use-resend-verification-email";
import { useResetPassword } from "../use-reset-password";
import { useSignInSocial } from "../use-sign-in-social";
import { useSignUpEmail } from "../use-sign-up-email";
import { useFormErrorShake } from "../use-form-error-shake";
import { useLogout } from "../use-logout";

// ============================================================================
// Helpers
// ============================================================================

const SUCCESS = { status: "success" as const, message: "OK" };
const ERROR = { status: "error" as const, message: "Erreur" };

// ============================================================================
// useChangePassword
// ============================================================================

describe("useChangePassword", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockChangePassword.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useChangePassword());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useChangePassword({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("calls onOpenChange(false) after a delay on success", async () => {
		vi.useFakeTimers();
		const onOpenChange = vi.fn();
		const { result } = renderHook(() => useChangePassword({ onOpenChange }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onOpenChange).not.toHaveBeenCalled();
		await act(async () => {
			vi.runAllTimers();
		});
		expect(onOpenChange).toHaveBeenCalledWith(false);
		vi.useRealTimers();
	});

	it("does not call onSuccess when action fails", async () => {
		mockChangePassword.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useChangePassword({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("does not show success or error toast (both suppressed)", async () => {
		const { toast } = await import("sonner");
		const { result } = renderHook(() => useChangePassword());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(toast.success).not.toHaveBeenCalled();
	});
});

// ============================================================================
// useRequestPasswordReset
// ============================================================================

describe("useRequestPasswordReset", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequestPasswordReset.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useRequestPasswordReset());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRequestPasswordReset({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockRequestPasswordReset.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useRequestPasswordReset({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state reflects the action result", async () => {
		const { result } = renderHook(() => useRequestPasswordReset());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(SUCCESS);
	});
});

// ============================================================================
// useResendVerificationEmail
// ============================================================================

describe("useResendVerificationEmail", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResendVerificationEmail.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useResendVerificationEmail());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useResendVerificationEmail({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockResendVerificationEmail.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useResendVerificationEmail({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options (no crash)", async () => {
		const { result } = renderHook(() => useResendVerificationEmail());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockResendVerificationEmail).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useResetPassword
// ============================================================================

describe("useResetPassword", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockResetPassword.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useResetPassword());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useResetPassword({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockResetPassword.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useResetPassword({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state reflects error result", async () => {
		mockResetPassword.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useResetPassword());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});
});

// ============================================================================
// useSignInSocial
// ============================================================================

describe("useSignInSocial", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSignInSocial.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useSignInSocial());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSignInSocial({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
	});

	it("does not call onSuccess when action fails", async () => {
		mockSignInSocial.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSignInSocial({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options (no crash)", async () => {
		const { result } = renderHook(() => useSignInSocial());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockSignInSocial).toHaveBeenCalledTimes(1);
	});
});

// ============================================================================
// useSignUpEmail
// ============================================================================

describe("useSignUpEmail", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSignUpEmail.mockResolvedValue({ ...SUCCESS, message: "Compte créé" });
	});

	it("returns state, action, and isPending", () => {
		const { result } = renderHook(() => useSignUpEmail());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
	});

	it("calls onSuccess with message when action succeeds", async () => {
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSignUpEmail({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledWith("Compte créé");
	});

	it("does not call onSuccess when action fails", async () => {
		mockSignUpEmail.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useSignUpEmail({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("state reflects error on failure", async () => {
		mockSignUpEmail.mockResolvedValue(ERROR);
		const { result } = renderHook(() => useSignUpEmail());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(result.current.state).toEqual(ERROR);
	});

	it("calls the action each time it is invoked", async () => {
		const { result } = renderHook(() => useSignUpEmail());

		await act(async () => {
			result.current.action(new FormData());
		});
		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockSignUpEmail).toHaveBeenCalledTimes(2);
	});
});

// ============================================================================
// useFormErrorShake
// ============================================================================

describe("useFormErrorShake", () => {
	it("returns shake as false and onShakeComplete as a function initially", () => {
		const { result } = renderHook(() => useFormErrorShake(false, undefined));
		expect(result.current.shake).toBe(false);
		expect(typeof result.current.onShakeComplete).toBe("function");
	});

	it("shake becomes true when isError is true with a new errorKey", () => {
		const { result } = renderHook(() => useFormErrorShake(true, "error-1"));
		expect(result.current.shake).toBe(true);
	});

	it("onShakeComplete resets shake to false", () => {
		const { result } = renderHook(() => useFormErrorShake(true, "error-1"));
		expect(result.current.shake).toBe(true);

		act(() => {
			result.current.onShakeComplete();
		});

		expect(result.current.shake).toBe(false);
	});

	it("shake stays false when isError is false", () => {
		const { result } = renderHook(() => useFormErrorShake(false, "error-1"));
		expect(result.current.shake).toBe(false);
	});

	it("shake triggers again when errorKey changes to a new value", () => {
		const { result, rerender } = renderHook(
			({ isError, errorKey }: { isError: boolean; errorKey: string | undefined }) =>
				useFormErrorShake(isError, errorKey),
			{ initialProps: { isError: true, errorKey: "error-1" } },
		);
		expect(result.current.shake).toBe(true);

		act(() => {
			result.current.onShakeComplete();
		});
		expect(result.current.shake).toBe(false);

		rerender({ isError: true, errorKey: "error-2" });
		expect(result.current.shake).toBe(true);
	});
});

// ============================================================================
// useLogout
// ============================================================================

describe("useLogout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockLogout.mockResolvedValue(SUCCESS);
	});

	it("returns state, action, isPending, and isLoggedOut", () => {
		const { result } = renderHook(() => useLogout());
		expect(result.current.state).toBeUndefined();
		expect(typeof result.current.action).toBe("function");
		expect(typeof result.current.isPending).toBe("boolean");
		expect(typeof result.current.isLoggedOut).toBe("boolean");
	});

	it("isLoggedOut starts as false", () => {
		const { result } = renderHook(() => useLogout());
		expect(result.current.isLoggedOut).toBe(false);
	});

	it("calls onSuccess when action succeeds", async () => {
		vi.useFakeTimers();
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useLogout({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).toHaveBeenCalledTimes(1);
		vi.useRealTimers();
	});

	it("resets badge counts store on success to prevent leak across users", async () => {
		vi.useFakeTimers();
		const { useBadgeCountsStore } = await import("@/shared/stores/badge-counts-store");
		useBadgeCountsStore.setState({ wishlistCount: 7, cartCount: 3 });

		const { result } = renderHook(() => useLogout());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(useBadgeCountsStore.getState().wishlistCount).toBe(0);
		expect(useBadgeCountsStore.getState().cartCount).toBe(0);
		vi.useRealTimers();
	});

	it("redirects to / after a delay on success", async () => {
		vi.useFakeTimers();
		const { result } = renderHook(() => useLogout());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockRouterPush).not.toHaveBeenCalled();
		await act(async () => {
			vi.runAllTimers();
		});
		expect(mockRouterPush).toHaveBeenCalledWith("/");
		expect(mockRouterRefresh).toHaveBeenCalled();
		vi.useRealTimers();
	});

	it("does not call onSuccess when action fails", async () => {
		mockLogout.mockResolvedValue(ERROR);
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useLogout({ onSuccess }));

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(onSuccess).not.toHaveBeenCalled();
	});

	it("works without options (no crash)", async () => {
		vi.useFakeTimers();
		const { result } = renderHook(() => useLogout());

		await act(async () => {
			result.current.action(new FormData());
		});

		expect(mockLogout).toHaveBeenCalledTimes(1);
		vi.useRealTimers();
	});
});
