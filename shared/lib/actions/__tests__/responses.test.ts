import { describe, it, expect } from "vitest";
import {
	success,
	error,
	notFound,
	unauthorized,
	forbidden,
	conflict,
	validationError,
} from "../responses";
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

		it("returns narrowed ERROR status type", () => {
			const result = error("Something failed");
			expect(result.status).toBe(ActionStatus.ERROR);
		});
	});

	describe("notFound", () => {
		it("returns NOT_FOUND status with masculine gendering by default", () => {
			const result = notFound("Produit");
			expect(result).toEqual({
				status: ActionStatus.NOT_FOUND,
				message: "Produit non trouvé",
			});
		});

		it("agrees at the feminine when the genre is declared", () => {
			expect(notFound("Commande", "f").message).toBe("Commande non trouvée");
		});

		it("keeps the masculine on a noun ending with 'e'", () => {
			// L'ancienne heuristique `resource.endsWith("e")` accordait au féminin ici :
			// le `e` final appartenait à l'ÉPITHÈTE, pas au nom.
			expect(notFound("Produit source").message).toBe("Produit source non trouvé");
		});

		it("agrees at the feminine on a noun NOT ending with 'e'", () => {
			// Symétrique du cas précédent : « Collection » et « Couleur » rendaient
			// « non trouvé » sur un nom féminin.
			expect(notFound("Collection", "f").message).toBe("Collection non trouvée");
			expect(notFound("Couleur", "f").message).toBe("Couleur non trouvée");
		});
	});

	describe("unauthorized", () => {
		it("returns UNAUTHORIZED with default message", () => {
			const result = unauthorized();
			expect(result).toEqual({
				status: ActionStatus.UNAUTHORIZED,
				message: "Connecte-toi pour effectuer cette action.",
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

	describe("conflict", () => {
		it("returns CONFLICT status", () => {
			const result = conflict("Cet email est déjà inscrit");
			expect(result).toEqual({
				status: ActionStatus.CONFLICT,
				message: "Cet email est déjà inscrit",
			});
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
