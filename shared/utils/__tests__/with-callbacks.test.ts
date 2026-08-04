import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ActionStatus } from "@/shared/types/server-action";
import { GENERIC_ERROR_MESSAGE } from "@/shared/constants/error-messages";

import { withCallbacks, getActionStatus } from "../with-callbacks";

// ============================================================================
// FIXTURES — erreurs framework RÉELLES
// ============================================================================
// Pas de mock de `unstable_rethrow` : on fabrique des erreurs portant les mêmes
// digests que redirect()/notFound(), pour exercer la vraie chaîne de détection
// de Next (isRedirectError / isHTTPAccessFallbackError). Si Next change son
// format de digest, ce test DOIT rougir — c'est le contrat qu'il verrouille.

const makeRedirectError = () =>
	Object.assign(new Error("NEXT_REDIRECT"), {
		digest: "NEXT_REDIRECT;push;/produits;307;",
	});

const makeNotFoundError = () =>
	Object.assign(new Error("NEXT_HTTP_ERROR_FALLBACK"), {
		digest: "NEXT_HTTP_ERROR_FALLBACK;404",
	});

// ============================================================================
// TESTS
// ============================================================================

describe("getActionStatus", () => {
	it("returns the status of an ActionState-shaped result", () => {
		expect(getActionStatus({ status: ActionStatus.SUCCESS, message: "OK" })).toBe(
			ActionStatus.SUCCESS,
		);
	});

	it("returns undefined for null, primitives and objects without status", () => {
		expect(getActionStatus(null)).toBeUndefined();
		expect(getActionStatus(undefined)).toBeUndefined();
		expect(getActionStatus("success")).toBeUndefined();
		expect(getActionStatus({ data: "raw" })).toBeUndefined();
	});
});

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
			expect.objectContaining({ status: ActionStatus.ERROR, message: GENERIC_ERROR_MESSAGE }),
		);
	});

	it("re-throws redirect errors from Next.js", async () => {
		const fn = vi.fn().mockRejectedValue(makeRedirectError());
		const wrapped = withCallbacks(fn, {});

		await expect(wrapped(undefined, formData)).rejects.toThrow("NEXT_REDIRECT");
	});

	it("dismisses the loading reference (onEnd) before re-throwing a redirect", async () => {
		// Sans ça, un redirect() dans une action à loadingMessage laisse un
		// toast.loading sans durée tourner indéfiniment après la navigation
		// (le Toaster vit dans le root layout et survit à la navigation client).
		const onStart = vi.fn().mockReturnValue("toast-1");
		const onEnd = vi.fn();
		const onError = vi.fn();
		const fn = vi.fn().mockRejectedValue(makeRedirectError());
		const wrapped = withCallbacks(fn, { onStart, onEnd, onError });

		await expect(wrapped(undefined, formData)).rejects.toThrow("NEXT_REDIRECT");

		expect(onEnd).toHaveBeenCalledWith("toast-1");
		expect(onError).not.toHaveBeenCalled();
	});

	it("re-throws notFound() instead of converting it into an error state", async () => {
		const onError = vi.fn();
		const fn = vi.fn().mockRejectedValue(makeNotFoundError());
		const wrapped = withCallbacks(fn, { onError });

		await expect(wrapped(undefined, formData)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK");

		expect(onError).not.toHaveBeenCalled();
	});

	it("returns an error ActionState for non-Error exceptions", async () => {
		const fn = vi.fn().mockRejectedValue("string error");
		const wrapped = withCallbacks(fn, {});

		const result = await wrapped(undefined, formData);

		expect(result).toEqual(
			expect.objectContaining({
				status: ActionStatus.ERROR,
				message: GENERIC_ERROR_MESSAGE,
			}),
		);
	});

	it("masks raw exception messages with the generic French message", async () => {
		// En prod, une exception serveur arrive masquée par Next en anglais ; en
		// dev elle porte un message technique. Aucun des deux ne doit atteindre
		// l'utilisateur — ni via toast, ni via un `state.message` rendu inline.
		const fn = vi.fn().mockRejectedValue(new Error("P2002 unique constraint failed"));
		const wrapped = withCallbacks(fn, {});

		const result = await wrapped(undefined, formData);

		expect((result as { message: string }).message).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("passes previous state and formData to the wrapped function", async () => {
		const fn = vi.fn().mockResolvedValue({ status: ActionStatus.SUCCESS, message: "OK" });
		const wrapped = withCallbacks(fn, {});
		const prevState = { status: ActionStatus.ERROR, message: "prev" };

		await wrapped(prevState as never, formData);

		expect(fn).toHaveBeenCalledWith(prevState, formData);
	});

	it("does not call onEnd when onStart returns undefined", async () => {
		const onStart = vi.fn().mockReturnValue(undefined);
		const onEnd = vi.fn();
		const fn = vi.fn().mockResolvedValue({ status: ActionStatus.SUCCESS, message: "OK" });
		const wrapped = withCallbacks(fn, { onStart, onEnd });

		await wrapped(undefined, formData);

		expect(onStart).toHaveBeenCalledTimes(1);
		expect(onEnd).not.toHaveBeenCalled();
	});

	it("does not call onEnd when onStart returns null", async () => {
		const onStart = vi.fn().mockReturnValue(null);
		const onEnd = vi.fn();
		const fn = vi.fn().mockResolvedValue({ status: ActionStatus.SUCCESS, message: "OK" });
		const wrapped = withCallbacks(fn, { onStart, onEnd });

		await wrapped(undefined, formData);

		expect(onEnd).not.toHaveBeenCalled();
	});

	it("calls onEnd when onStart returns 0 (falsy but valid reference)", async () => {
		// Les ids de toast sont `string | number` : 0 est une référence légitime.
		// Aligné avec le `!= null` de createToastCallbacks.onEnd.
		const onStart = vi.fn().mockReturnValue(0);
		const onEnd = vi.fn();
		const fn = vi.fn().mockResolvedValue({ status: ActionStatus.SUCCESS, message: "OK" });
		const wrapped = withCallbacks(fn, { onStart, onEnd });

		await wrapped(undefined, formData);

		expect(onEnd).toHaveBeenCalledWith(0);
	});

	it.each([
		["UNAUTHORIZED", ActionStatus.UNAUTHORIZED],
		["VALIDATION_ERROR", ActionStatus.VALIDATION_ERROR],
		["NOT_FOUND", ActionStatus.NOT_FOUND],
		["CONFLICT", ActionStatus.CONFLICT],
		["FORBIDDEN", ActionStatus.FORBIDDEN],
	])("calls onError when action returns %s status", async (_label, status) => {
		const onError = vi.fn();
		const result = { status, message: "some error" };
		const fn = vi.fn().mockResolvedValue(result);
		const wrapped = withCallbacks(fn, { onError });

		await wrapped(undefined, formData);

		expect(onError).toHaveBeenCalledWith(result);
	});

	it("does not call any status callback when result has no status property", async () => {
		const onSuccess = vi.fn();
		const onError = vi.fn();
		const onWarning = vi.fn();
		const fn = vi.fn().mockResolvedValue({ data: "raw" });
		const wrapped = withCallbacks(fn, { onSuccess, onError, onWarning });

		await wrapped(undefined, formData);

		expect(onSuccess).not.toHaveBeenCalled();
		expect(onError).not.toHaveBeenCalled();
		expect(onWarning).not.toHaveBeenCalled();
	});

	it("does not call any status callback for INITIAL status", async () => {
		// INITIAL est l'état de repos de useActionState, pas un échec : le router
		// dans onError afficherait un toast d'erreur sans erreur.
		const onSuccess = vi.fn();
		const onError = vi.fn();
		const onWarning = vi.fn();
		const fn = vi.fn().mockResolvedValue({ status: ActionStatus.INITIAL, message: "" });
		const wrapped = withCallbacks(fn, { onSuccess, onError, onWarning });

		await wrapped(undefined, formData);

		expect(onSuccess).not.toHaveBeenCalled();
		expect(onError).not.toHaveBeenCalled();
		expect(onWarning).not.toHaveBeenCalled();
	});

	it("works correctly when no callbacks are provided at all", async () => {
		const fn = vi.fn().mockResolvedValue({ status: ActionStatus.SUCCESS, message: "OK" });
		const wrapped = withCallbacks(fn, {});

		const result = await wrapped(undefined, formData);

		expect(result).toEqual({ status: ActionStatus.SUCCESS, message: "OK" });
	});

	it("returns the action result on success", async () => {
		const expected = { status: ActionStatus.SUCCESS, message: "Created", data: { id: "1" } };
		const fn = vi.fn().mockResolvedValue(expected);
		const wrapped = withCallbacks(fn, {});

		const result = await wrapped(undefined, formData);

		expect(result).toEqual(expected);
	});

	it("does not call onEnd on exception when onStart returned no reference", async () => {
		const onEnd = vi.fn();
		const fn = vi.fn().mockRejectedValue(new Error("boom"));
		const wrapped = withCallbacks(fn, { onEnd });

		await wrapped(undefined, formData);

		expect(onEnd).not.toHaveBeenCalled();
	});

	describe("throwing callbacks", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("does not report the action as failed when onSuccess throws", async () => {
			// La mutation serveur a RÉUSSI : fabriquer un état ERROR ici pousserait
			// l'utilisateur à re-soumettre (double commande, double paiement).
			const success = { status: ActionStatus.SUCCESS, message: "OK" };
			const fn = vi.fn().mockResolvedValue(success);
			const onSuccess = vi.fn(() => {
				throw new Error("callback bug");
			});
			const onError = vi.fn();
			const wrapped = withCallbacks(fn, { onSuccess, onError });

			const result = await wrapped(undefined, formData);

			expect(result).toEqual(success);
			expect(onError).not.toHaveBeenCalled();
			// L'erreur n'est pas avalée : re-throw asynchrone, capté par le handler
			// global d'instrumentation-client (→ Sentry).
			expect(() => vi.runAllTimers()).toThrow("callback bug");
		});

		it("still returns the fabricated error state when onError throws on exception", async () => {
			const fn = vi.fn().mockRejectedValue(new Error("crash"));
			const onError = vi.fn(() => {
				throw new Error("onError bug");
			});
			const wrapped = withCallbacks(fn, { onError });

			const result = await wrapped(undefined, formData);

			expect(result).toEqual(
				expect.objectContaining({ status: ActionStatus.ERROR, message: GENERIC_ERROR_MESSAGE }),
			);
			expect(() => vi.runAllTimers()).toThrow("onError bug");
		});
	});
});
