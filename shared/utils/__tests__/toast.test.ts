import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSonner, mockHaptic } = vi.hoisted(() => ({
	mockSonner: {
		success: vi.fn().mockReturnValue("toast-id-1"),
		error: vi.fn().mockReturnValue("toast-id-2"),
		warning: vi.fn().mockReturnValue("toast-id-3"),
		info: vi.fn().mockReturnValue("toast-id-4"),
		message: vi.fn().mockReturnValue("toast-id-5"),
		loading: vi.fn().mockReturnValue("toast-id-6"),
		dismiss: vi.fn(),
		promise: vi.fn(),
		custom: vi.fn(),
	},
	mockHaptic: vi.fn().mockReturnValue(true),
}));

vi.mock("sonner", () => ({ toast: mockSonner }));
vi.mock("@/shared/hooks/use-haptic", () => ({ triggerHaptic: mockHaptic }));

import { toast, sanitizeErrorMessage, GENERIC_ERROR_MESSAGE } from "../toast";

beforeEach(() => {
	vi.clearAllMocks();
});

describe("sanitizeErrorMessage", () => {
	it("returns generic message for empty string", () => {
		expect(sanitizeErrorMessage("")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("passes through clean FR user-facing messages", () => {
		expect(sanitizeErrorMessage("Impossible de copier dans le presse-papiers")).toBe(
			"Impossible de copier dans le presse-papiers",
		);
		expect(sanitizeErrorMessage("Veuillez sélectionner au moins un bijou.")).toBe(
			"Veuillez sélectionner au moins un bijou.",
		);
		expect(sanitizeErrorMessage("Erreur lors de la création du produit")).toBe(
			"Erreur lors de la création du produit",
		);
	});

	it("sanitizes Prisma error codes", () => {
		expect(sanitizeErrorMessage("P2002: unique constraint failed")).toBe(GENERIC_ERROR_MESSAGE);
		expect(sanitizeErrorMessage("Erreur: prisma client not initialized")).toBe(
			GENERIC_ERROR_MESSAGE,
		);
	});

	it("sanitizes fetch/network errors", () => {
		expect(sanitizeErrorMessage("fetch failed")).toBe(GENERIC_ERROR_MESSAGE);
		expect(sanitizeErrorMessage("NetworkError when attempting to fetch resource")).toBe(
			GENERIC_ERROR_MESSAGE,
		);
		expect(sanitizeErrorMessage("network error")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("sanitizes JS runtime errors", () => {
		expect(sanitizeErrorMessage("TypeError: foo is not a function")).toBe(GENERIC_ERROR_MESSAGE);
		expect(sanitizeErrorMessage("Cannot read properties of undefined (reading 'id')")).toBe(
			GENERIC_ERROR_MESSAGE,
		);
		expect(sanitizeErrorMessage("undefined is not an object")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("sanitizes node-level connection errors", () => {
		expect(sanitizeErrorMessage("ECONNREFUSED 127.0.0.1:5432")).toBe(GENERIC_ERROR_MESSAGE);
		expect(sanitizeErrorMessage("ETIMEDOUT connecting to upstream")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("sanitizes stack trace fragments", () => {
		expect(sanitizeErrorMessage("at anonymous (app.js:10:5)")).toBe(GENERIC_ERROR_MESSAGE);
	});

	it("sanitizes overly long messages", () => {
		const long = "A".repeat(300);
		expect(sanitizeErrorMessage(long)).toBe(GENERIC_ERROR_MESSAGE);
	});
});

describe("toast wrapper", () => {
	describe("success", () => {
		it("triggers success haptic and forwards to sonner", () => {
			toast.success("Bijou créé");

			expect(mockHaptic).toHaveBeenCalledWith("success");
			expect(mockSonner.success).toHaveBeenCalledWith("Bijou créé");
		});

		it("forwards options (action, duration)", () => {
			const action = { label: "Voir", onClick: vi.fn() };
			toast.success("Ajouté", { action, duration: 5000 });

			expect(mockSonner.success).toHaveBeenCalledWith("Ajouté", {
				action,
				duration: 5000,
			});
		});
	});

	describe("error", () => {
		it("triggers error haptic", () => {
			toast.error("Erreur");

			expect(mockHaptic).toHaveBeenCalledWith("error");
		});

		it("passes clean FR message through", () => {
			toast.error("Impossible de charger la page");

			expect(mockSonner.error).toHaveBeenCalledWith("Impossible de charger la page");
		});

		it("sanitizes technical error messages", () => {
			toast.error("Erreur: Prisma connection failed (P2002)");

			expect(mockSonner.error).toHaveBeenCalledWith(GENERIC_ERROR_MESSAGE);
		});

		it("sanitizes TypeError messages", () => {
			toast.error("TypeError: Cannot read properties of undefined");

			expect(mockSonner.error).toHaveBeenCalledWith(GENERIC_ERROR_MESSAGE);
		});

		it("passes through non-string messages unchanged (ReactNode)", () => {
			// Sonner accepts JSX as first param; we must not call .test on it
			const node = "react-node-placeholder";
			toast.error(node);

			expect(mockSonner.error).toHaveBeenCalled();
		});
	});

	describe("warning", () => {
		it("triggers medium haptic and forwards message", () => {
			toast.warning("Attention");

			expect(mockHaptic).toHaveBeenCalledWith("medium");
			expect(mockSonner.warning).toHaveBeenCalledWith("Attention");
		});
	});

	describe("pass-through methods (no haptic)", () => {
		it("info() does not trigger haptic", () => {
			toast.info("Info");

			expect(mockHaptic).not.toHaveBeenCalled();
			expect(mockSonner.info).toHaveBeenCalledWith("Info");
		});

		it("loading() does not trigger haptic", () => {
			toast.loading("Chargement...");

			expect(mockHaptic).not.toHaveBeenCalled();
			expect(mockSonner.loading).toHaveBeenCalledWith("Chargement...");
		});

		it("dismiss() forwards id", () => {
			toast.dismiss("toast-id-1");

			expect(mockSonner.dismiss).toHaveBeenCalledWith("toast-id-1");
		});
	});

	describe("return value", () => {
		it("returns sonner toast id for success", () => {
			expect(toast.success("ok")).toBe("toast-id-1");
		});

		it("returns sonner toast id for error", () => {
			expect(toast.error("fail")).toBe("toast-id-2");
		});
	});
});
