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

import { toast, sanitizeErrorMessage, GENERIC_ERROR_MESSAGE, computeDuration } from "../toast";

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

describe("computeDuration", () => {
	it("respects MIN_DURATION floor per type", () => {
		// "Bijou créé" = 2 mots = ~800ms+500 = 1300 → floor success=2000
		expect(computeDuration("Bijou créé", "success")).toBe(2000);
		// Short error → floor error=5000
		expect(computeDuration("Erreur", "error")).toBe(5000);
		// Short warning → floor warning=4000
		expect(computeDuration("Stop", "warning")).toBe(4000);
	});

	it("scales up for long messages (WPS-based)", () => {
		// 12 mots / 2.5 = 4.8s → 4800+500 = 5300 (dépasse floor success 2000)
		const twelveWords = "Votre commande a bien été prise en compte et sera expédiée demain matin";
		const result = computeDuration(twelveWords, "success");
		expect(result).toBeGreaterThanOrEqual(5300);
	});

	it("returns floor for non-string messages", () => {
		expect(computeDuration(null, "success")).toBe(2000);
		expect(computeDuration(undefined, "error")).toBe(5000);
		expect(computeDuration({ jsx: true }, "info")).toBe(2500);
	});

	it("returns floor for empty string", () => {
		expect(computeDuration("", "warning")).toBe(4000);
	});
});

describe("toast wrapper", () => {
	describe("success", () => {
		it("triggers success haptic and forwards to sonner with computed duration", () => {
			toast.success("Bijou créé");

			expect(mockHaptic).toHaveBeenCalledWith("success");
			expect(mockSonner.success).toHaveBeenCalledWith(
				"Bijou créé",
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});

		it("caller duration overrides computed duration", () => {
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

		it("passes clean FR message through with error duration floor", () => {
			toast.error("Impossible de charger la page");

			expect(mockSonner.error).toHaveBeenCalledWith(
				"Impossible de charger la page",
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});

		it("sanitizes technical error messages", () => {
			toast.error("Erreur: Prisma connection failed (P2002)");

			expect(mockSonner.error).toHaveBeenCalledWith(
				GENERIC_ERROR_MESSAGE,
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});

		it("sanitizes TypeError messages", () => {
			toast.error("TypeError: Cannot read properties of undefined");

			expect(mockSonner.error).toHaveBeenCalledWith(
				GENERIC_ERROR_MESSAGE,
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});

		it("dismisses pending non-error toast (priority lane)", () => {
			mockSonner.success.mockReturnValueOnce("success-id-42");
			toast.success("Bijou ajouté");
			toast.error("Stock insuffisant");

			expect(mockSonner.dismiss).toHaveBeenCalledWith("success-id-42");
		});

		it("passes through non-string messages unchanged (ReactNode)", () => {
			const node = "react-node-placeholder";
			toast.error(node);

			expect(mockSonner.error).toHaveBeenCalled();
		});
	});

	describe("warning", () => {
		it("triggers medium haptic and forwards message with warning duration floor", () => {
			toast.warning("Attention");

			expect(mockHaptic).toHaveBeenCalledWith("medium");
			expect(mockSonner.warning).toHaveBeenCalledWith(
				"Attention",
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});
	});

	describe("info", () => {
		it("does not trigger haptic, forwards with info duration floor", () => {
			toast.info("Info");

			expect(mockHaptic).not.toHaveBeenCalled();
			expect(mockSonner.info).toHaveBeenCalledWith(
				"Info",
				expect.objectContaining({ duration: expect.any(Number) }),
			);
		});
	});

	describe("pass-through methods (no haptic, no duration override)", () => {
		it("loading() does not trigger haptic or duration", () => {
			toast.loading("Chargement...");

			expect(mockHaptic).not.toHaveBeenCalled();
			expect(mockSonner.loading).toHaveBeenCalledWith("Chargement...");
		});

		it("dismiss() forwards id", () => {
			toast.dismiss("toast-id-1");

			expect(mockSonner.dismiss).toHaveBeenCalledWith("toast-id-1");
		});
	});

	describe("screen reader announcer", () => {
		it("updates sr-only polite region on success (after rAF)", async () => {
			const polite = document.createElement("div");
			polite.id = "toast-live-polite";
			document.body.appendChild(polite);

			toast.success("Bijou ajouté");
			await new Promise((r) => requestAnimationFrame(r));

			expect(polite.textContent).toBe("Bijou ajouté");
			polite.remove();
		});

		it("updates sr-only assertive region on error (sanitized)", async () => {
			const assertive = document.createElement("div");
			assertive.id = "toast-live-assertive";
			document.body.appendChild(assertive);

			toast.error("TypeError: boom");
			await new Promise((r) => requestAnimationFrame(r));

			expect(assertive.textContent).toBe(GENERIC_ERROR_MESSAGE);
			assertive.remove();
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
