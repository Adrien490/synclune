import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";

vi.mock("next/dist/client/components/redirect-error", () => ({
	isRedirectError: vi.fn((err: unknown) => err instanceof Error && err.message === "NEXT_REDIRECT"),
}));

import { withCallbacks } from "../with-callbacks";

// ============================================================================
// TESTS
// ============================================================================

describe("withCallbacks", () => {
	const formData = new FormData();

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("calls onStart before executing the function", async () => {
		const onStart = vi.fn();
		const fn = vi.fn().mockResolvedValue({ status: ActionStatus.SUCCESS, message: "OK" });
		const wrapped = withCallbacks(fn, { onStart });

		await wrapped(undefined, formData);

		expect(onStart).toHaveBeenCalledTimes(1);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("calls onSuccess when action returns SUCCESS", async () => {
		const onSuccess = vi.fn();
		const result = { status: ActionStatus.SUCCESS, message: "OK" };
		const fn = vi.fn().mockResolvedValue(result);
		const wrapped = withCallbacks(fn, { onSuccess });

		await wrapped(undefined, formData);

		expect(onSuccess).toHaveBeenCalledWith(result);
	});

	it("calls onWarning when action returns WARNING", async () => {
		const onWarning = vi.fn();
		const result = { status: ActionStatus.WARNING, message: "Attention" };
		const fn = vi.fn().mockResolvedValue(result);
		const wrapped = withCallbacks(fn, { onWarning });

		await wrapped(undefined, formData);

		expect(onWarning).toHaveBeenCalledWith(result);
	});

	it("calls onError when action returns error status", async () => {
		const onError = vi.fn();
		const result = { status: ActionStatus.ERROR, message: "Failed" };
		const fn = vi.fn().mockResolvedValue(result);
		const wrapped = withCallbacks(fn, { onError });

		await wrapped(undefined, formData);

		expect(onError).toHaveBeenCalledWith(result);
	});

	it("calls onEnd with reference from onStart", async () => {
		const toastRef = { id: "toast-1" };
		const onStart = vi.fn().mockReturnValue(toastRef);
		const onEnd = vi.fn();
		const fn = vi.fn().mockResolvedValue({ status: ActionStatus.SUCCESS, message: "OK" });
		const wrapped = withCallbacks(fn, { onStart, onEnd });

		await wrapped(undefined, formData);

		expect(onEnd).toHaveBeenCalledWith(toastRef);
	});

	it("calls onEnd and onError on exception", async () => {
		const toastRef = { id: "toast-1" };
		const onStart = vi.fn().mockReturnValue(toastRef);
		const onEnd = vi.fn();
		const onError = vi.fn();
		const fn = vi.fn().mockRejectedValue(new Error("crash"));
		const wrapped = withCallbacks(fn, { onStart, onEnd, onError });

		const result = await wrapped(undefined, formData);

		expect(onEnd).toHaveBeenCalledWith(toastRef);
		expect(onError).toHaveBeenCalled();
		expect(result).toEqual(
			expect.objectContaining({ status: ActionStatus.ERROR, message: "crash" }),
		);
	});

	it("re-throws redirect errors from Next.js", async () => {
		const redirectError = new Error("NEXT_REDIRECT");
		const fn = vi.fn().mockRejectedValue(redirectError);
		const wrapped = withCallbacks(fn, {});

		await expect(wrapped(undefined, formData)).rejects.toThrow("NEXT_REDIRECT");
	});

	it("returns an error ActionState for non-Error exceptions", async () => {
		const fn = vi.fn().mockRejectedValue("string error");
		const wrapped = withCallbacks(fn, {});

		const result = await wrapped(undefined, formData);

		expect(result).toEqual(
			expect.objectContaining({
				status: ActionStatus.ERROR,
				message: "Une erreur inattendue est survenue",
			}),
		);
	});

	it("passes previous state and formData to the wrapped function", async () => {
		const fn = vi.fn().mockResolvedValue({ status: ActionStatus.SUCCESS, message: "OK" });
		const wrapped = withCallbacks(fn, {});
		const prevState = { status: ActionStatus.ERROR, message: "prev" };

		await wrapped(prevState as never, formData);

		expect(fn).toHaveBeenCalledWith(prevState, formData);
	});
});
