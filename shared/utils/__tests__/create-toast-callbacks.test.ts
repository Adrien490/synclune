import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockToast } = vi.hoisted(() => ({
	mockToast: {
		loading: vi.fn().mockReturnValue("toast-ref-1"),
		dismiss: vi.fn(),
		success: vi.fn(),
		warning: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock("sonner", () => ({ toast: mockToast }));

import { createToastCallbacks, hasMessage } from "../create-toast-callbacks";
import { ActionStatus } from "@/shared/types/server-action";

describe("hasMessage", () => {
	it("returns true for object with non-empty message string", () => {
		expect(hasMessage({ message: "Success" })).toBe(true);
	});

	it("returns false for null", () => {
		expect(hasMessage(null)).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(hasMessage(undefined)).toBe(false);
	});

	it("returns false for primitive", () => {
		expect(hasMessage("string")).toBe(false);
	});

	it("returns false for object without message", () => {
		expect(hasMessage({ status: "ok" })).toBe(false);
	});

	it("returns false for object with empty message", () => {
		expect(hasMessage({ message: "" })).toBe(false);
	});

	it("returns false for object with non-string message", () => {
		expect(hasMessage({ message: 42 })).toBe(false);
	});

	it("returns true for object with message and extra properties", () => {
		expect(hasMessage({ message: "Done", status: ActionStatus.SUCCESS })).toBe(true);
	});
});

describe("createToastCallbacks", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockToast.loading.mockReturnValue("toast-ref-1");
	});

	describe("onStart", () => {
		it("shows loading toast when loadingMessage is provided", () => {
			const callbacks = createToastCallbacks({ loadingMessage: "Loading..." });
			const ref = callbacks.onStart();

			expect(mockToast.loading).toHaveBeenCalledWith("Loading...");
			expect(ref).toBe("toast-ref-1");
		});

		it("returns undefined when no loadingMessage", () => {
			const callbacks = createToastCallbacks();
			const ref = callbacks.onStart();

			expect(mockToast.loading).not.toHaveBeenCalled();
			expect(ref).toBeUndefined();
		});
	});

	describe("onEnd", () => {
		it("dismisses toast when reference is provided", () => {
			const callbacks = createToastCallbacks();
			callbacks.onEnd("toast-ref-1");

			expect(mockToast.dismiss).toHaveBeenCalledWith("toast-ref-1");
		});

		it("does not dismiss when reference is undefined", () => {
			const callbacks = createToastCallbacks();
			callbacks.onEnd(undefined);

			expect(mockToast.dismiss).not.toHaveBeenCalled();
		});
	});

	describe("onSuccess", () => {
		it("shows success toast with message", () => {
			const callbacks = createToastCallbacks();
			callbacks.onSuccess({ message: "Created!", status: ActionStatus.SUCCESS });

			expect(mockToast.success).toHaveBeenCalledWith("Created!");
		});

		it("shows success toast with action", () => {
			const action = { label: "View", onClick: vi.fn() };
			const callbacks = createToastCallbacks({ successAction: action });
			callbacks.onSuccess({ message: "Added!", status: ActionStatus.SUCCESS });

			expect(mockToast.success).toHaveBeenCalledWith("Added!", { action });
		});

		it("does not show toast when showSuccessToast is false", () => {
			const callbacks = createToastCallbacks({ showSuccessToast: false });
			callbacks.onSuccess({ message: "Done", status: ActionStatus.SUCCESS });

			expect(mockToast.success).not.toHaveBeenCalled();
		});

		it("calls custom onSuccess callback", () => {
			const custom = vi.fn();
			const callbacks = createToastCallbacks({ onSuccess: custom });
			const result = { message: "OK", status: ActionStatus.SUCCESS };
			callbacks.onSuccess(result);

			expect(custom).toHaveBeenCalledWith(result);
		});

		it("does not show toast for result without message", () => {
			const callbacks = createToastCallbacks();
			callbacks.onSuccess({ status: ActionStatus.SUCCESS } as never);

			expect(mockToast.success).not.toHaveBeenCalled();
		});
	});

	describe("onWarning", () => {
		it("shows warning toast with message", () => {
			const callbacks = createToastCallbacks();
			callbacks.onWarning({ message: "Careful!", status: ActionStatus.WARNING });

			expect(mockToast.warning).toHaveBeenCalledWith("Careful!");
		});

		it("does not show toast when showWarningToast is false", () => {
			const callbacks = createToastCallbacks({ showWarningToast: false });
			callbacks.onWarning({ message: "Warning", status: ActionStatus.WARNING });

			expect(mockToast.warning).not.toHaveBeenCalled();
		});

		it("calls custom onWarning callback", () => {
			const custom = vi.fn();
			const callbacks = createToastCallbacks({ onWarning: custom });
			const result = { message: "Warn", status: ActionStatus.WARNING };
			callbacks.onWarning(result);

			expect(custom).toHaveBeenCalledWith(result);
		});
	});

	describe("onError", () => {
		it("shows error toast with message", () => {
			const callbacks = createToastCallbacks();
			callbacks.onError({ message: "Failed!", status: ActionStatus.ERROR });

			expect(mockToast.error).toHaveBeenCalledWith("Failed!");
		});

		it("does not show toast when showErrorToast is false", () => {
			const callbacks = createToastCallbacks({ showErrorToast: false });
			callbacks.onError({ message: "Error", status: ActionStatus.ERROR });

			expect(mockToast.error).not.toHaveBeenCalled();
		});

		it("calls custom onError callback", () => {
			const custom = vi.fn();
			const callbacks = createToastCallbacks({ onError: custom });
			const result = { message: "Fail", status: ActionStatus.ERROR };
			callbacks.onError(result);

			expect(custom).toHaveBeenCalledWith(result);
		});

		it("does not show error toast for VALIDATION_ERROR status", () => {
			const callbacks = createToastCallbacks();
			callbacks.onError({ message: "Invalid field", status: ActionStatus.VALIDATION_ERROR });

			expect(mockToast.error).not.toHaveBeenCalled();
		});

		it("still calls custom onError callback for VALIDATION_ERROR", () => {
			const custom = vi.fn();
			const callbacks = createToastCallbacks({ onError: custom });
			const result = { message: "Invalid", status: ActionStatus.VALIDATION_ERROR };
			callbacks.onError(result);

			expect(custom).toHaveBeenCalledWith(result);
		});

		it("shows error toast for UNAUTHORIZED status", () => {
			const callbacks = createToastCallbacks();
			callbacks.onError({ message: "Unauthorized", status: ActionStatus.UNAUTHORIZED });

			expect(mockToast.error).toHaveBeenCalledWith("Unauthorized");
		});

		it("shows error toast for NOT_FOUND status", () => {
			const callbacks = createToastCallbacks();
			callbacks.onError({ message: "Not found", status: ActionStatus.NOT_FOUND });

			expect(mockToast.error).toHaveBeenCalledWith("Not found");
		});

		it("does not show toast for result without message", () => {
			const callbacks = createToastCallbacks();
			callbacks.onError({ status: ActionStatus.ERROR } as never);

			expect(mockToast.error).not.toHaveBeenCalled();
		});
	});

	describe("onEnd with numeric reference", () => {
		it("dismisses toast when reference is a number", () => {
			const callbacks = createToastCallbacks();
			callbacks.onEnd(42);

			expect(mockToast.dismiss).toHaveBeenCalledWith(42);
		});

		it("dismisses toast when reference is zero", () => {
			const callbacks = createToastCallbacks();
			callbacks.onEnd(0);

			// 0 is falsy but defined — the check is `!== undefined`
			expect(mockToast.dismiss).toHaveBeenCalledWith(0);
		});
	});

	describe("default options", () => {
		it("returns callbacks when called with no options", () => {
			const callbacks = createToastCallbacks();

			expect(callbacks).toHaveProperty("onStart");
			expect(callbacks).toHaveProperty("onEnd");
			expect(callbacks).toHaveProperty("onSuccess");
			expect(callbacks).toHaveProperty("onWarning");
			expect(callbacks).toHaveProperty("onError");
		});

		it("does not crash when all show flags are false and result has no message", () => {
			const callbacks = createToastCallbacks({
				showSuccessToast: false,
				showWarningToast: false,
				showErrorToast: false,
			});

			expect(() => callbacks.onSuccess({ status: ActionStatus.SUCCESS } as never)).not.toThrow();
			expect(() => callbacks.onWarning({ status: ActionStatus.WARNING } as never)).not.toThrow();
			expect(() => callbacks.onError({ status: ActionStatus.ERROR } as never)).not.toThrow();
		});
	});
});
