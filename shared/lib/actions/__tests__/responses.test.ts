import { describe, it, expect } from "vitest";
import { success, error, notFound, unauthorized, forbidden, validationError } from "../responses";
import { ActionStatus } from "@/shared/types/server-action";

describe("responses", () => {
	describe("success", () => {
		it("returns SUCCESS status with message", () => {
			const result = success("Produit créé");
			expect(result).toEqual({
				status: ActionStatus.SUCCESS,
				message: "Produit créé",
				data: undefined,
			});
		});

		it("includes data when provided", () => {
			const result = success("OK", { productId: "123" });
			expect(result.data).toEqual({ productId: "123" });
		});

		it("handles undefined data explicitly", () => {
			const result = success("OK", undefined);
			expect(result.data).toBeUndefined();
		});
	});

	describe("error", () => {
		it("returns ERROR status by default", () => {
			const result = error("Something went wrong");
			expect(result).toEqual({
				status: ActionStatus.ERROR,
				message: "Something went wrong",
			});
		});

		it("accepts custom status", () => {
			const result = error("Conflict", ActionStatus.CONFLICT);
			expect(result.status).toBe(ActionStatus.CONFLICT);
		});
	});

	describe("notFound", () => {
		it("returns NOT_FOUND status with masculine gendering", () => {
			const result = notFound("Produit");
			expect(result).toEqual({
				status: ActionStatus.NOT_FOUND,
				message: "Produit non trouvé",
			});
		});

		it("adds feminine gendering when resource ends with 'e'", () => {
			const result = notFound("Commande");
			expect(result.message).toBe("Commande non trouvée");
		});

		it("keeps masculine for resource not ending in 'e'", () => {
			const result = notFound("Coupon");
			expect(result.message).toBe("Coupon non trouvé");
		});
	});

	describe("unauthorized", () => {
		it("returns UNAUTHORIZED with default message", () => {
			const result = unauthorized();
			expect(result).toEqual({
				status: ActionStatus.UNAUTHORIZED,
				message: "Vous devez être connecté pour effectuer cette action",
			});
		});

		it("accepts custom message", () => {
			const result = unauthorized("Session expirée");
			expect(result.message).toBe("Session expirée");
		});
	});

	describe("forbidden", () => {
		it("returns FORBIDDEN with default message", () => {
			const result = forbidden();
			expect(result).toEqual({
				status: ActionStatus.FORBIDDEN,
				message: "Accès non autorisé",
			});
		});

		it("accepts custom message", () => {
			const result = forbidden("Réservé aux admins");
			expect(result.message).toBe("Réservé aux admins");
		});
	});

	describe("validationError", () => {
		it("returns VALIDATION_ERROR status", () => {
			const result = validationError("L'email est invalide");
			expect(result).toEqual({
				status: ActionStatus.VALIDATION_ERROR,
				message: "L'email est invalide",
			});
		});
	});
});
