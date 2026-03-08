import { describe, it, expect, vi, beforeEach } from "vitest";
import { type ZodError, z } from "zod";
import { ActionStatus } from "@/shared/types/server-action";

const { mockIsRedirectError, mockLogger } = vi.hoisted(() => ({
	mockIsRedirectError: vi.fn(),
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("next/dist/client/components/redirect-error", () => ({
	isRedirectError: mockIsRedirectError,
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
	captureMessage: vi.fn(),
	addBreadcrumb: vi.fn(),
}));

import { BusinessError, handleActionError } from "../errors";

describe("BusinessError", () => {
	it("is an instance of Error", () => {
		const err = new BusinessError("Stock insuffisant");
		expect(err).toBeInstanceOf(Error);
	});

	it("has name 'BusinessError'", () => {
		const err = new BusinessError("msg");
		expect(err.name).toBe("BusinessError");
	});

	it("preserves the message", () => {
		const err = new BusinessError("Produit indisponible");
		expect(err.message).toBe("Produit indisponible");
	});
});

describe("handleActionError", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockIsRedirectError.mockReturnValue(false);
	});

	it("re-throws redirect errors", () => {
		const redirectErr = new Error("NEXT_REDIRECT");
		mockIsRedirectError.mockReturnValue(true);

		expect(() => handleActionError(redirectErr)).toThrow(redirectErr);
	});

	it("converts ZodError to VALIDATION_ERROR", () => {
		const schema = z.object({ email: z.string().email("Email invalide") });
		let zodError: ZodError;
		try {
			schema.parse({ email: "not-an-email" });
			throw new Error("Should not reach");
		} catch (e) {
			zodError = e as ZodError;
		}

		const result = handleActionError(zodError!);
		expect(result.status).toBe(ActionStatus.VALIDATION_ERROR);
		expect(result.message).toBe("Email invalide");
	});

	it("exposes BusinessError message to user", () => {
		const result = handleActionError(new BusinessError("Stock insuffisant"));
		expect(result).toEqual({
			status: ActionStatus.ERROR,
			message: "Stock insuffisant",
		});
	});

	it("hides technical error details and uses defaultMessage", () => {
		const result = handleActionError(new Error("P2002: Unique constraint"), "Échec de création");
		expect(result.message).toBe("Échec de création");
		expect(result.message).not.toContain("P2002");
	});

	it("logs technical errors via logger.error", () => {
		handleActionError(new TypeError("Cannot read property"));
		expect(mockLogger.error).toHaveBeenCalledWith(
			expect.stringContaining("TypeError: Cannot read property"),
			expect.any(TypeError),
			undefined,
		);
	});

	it("uses fallback message when no defaultMessage provided", () => {
		const result = handleActionError(new Error("some internal error"));
		expect(result.message).toBe("Une erreur est survenue");
	});

	it("handles non-Error values gracefully", () => {
		const result = handleActionError("string error", "Erreur par défaut");
		expect(result).toEqual({
			status: ActionStatus.ERROR,
			message: "Erreur par défaut",
		});
	});

	it("handles null/undefined errors", () => {
		const result = handleActionError(null);
		expect(result.status).toBe(ActionStatus.ERROR);
		expect(result.message).toBe("Une erreur est survenue");
	});
});
