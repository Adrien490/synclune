import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActionStatus, type ActionState } from "@/shared/types/server-action";

import { parseServerFieldError, useServerFieldErrors } from "../use-server-field-errors";

const FIELDS = ["size", "priceEuros", "media"] as const;

describe("parseServerFieldError", () => {
	it("extrait le champ et le message d'un préfixe path connu", () => {
		expect(parseServerFieldError("size: Trop long", FIELDS)).toEqual({
			field: "size",
			message: "Trop long",
		});
	});

	it("remonte au champ racine pour un path Zod imbriqué", () => {
		expect(parseServerFieldError("media.0.url: URL invalide", FIELDS)).toEqual({
			field: "media",
			message: "URL invalide",
		});
	});

	it("retourne null pour un path inconnu (message global)", () => {
		expect(parseServerFieldError("productId: Requis", FIELDS)).toBeNull();
	});

	it("retourne null pour un message sans préfixe", () => {
		expect(parseServerFieldError("Données invalides.", FIELDS)).toBeNull();
	});

	it("ne confond pas un message contenant un deux-points en milieu de phrase", () => {
		expect(parseServerFieldError("Erreur : réessayez plus tard", FIELDS)).toBeNull();
	});
});

describe("useServerFieldErrors", () => {
	const validationError = (message: string): ActionState => ({
		status: ActionStatus.VALIDATION_ERROR,
		message,
	});

	it("mappe une VALIDATION_ERROR path-préfixée sur le champ et ne retourne rien en global", () => {
		const setFieldError = vi.fn();
		const onFieldError = vi.fn();

		const { result } = renderHook(() =>
			useServerFieldErrors({
				state: validationError("size: Trop long"),
				fieldNames: FIELDS,
				setFieldError,
				onFieldError,
			}),
		);

		expect(result.current).toEqual([]);
		expect(setFieldError).toHaveBeenCalledWith("size", "Trop long");
		expect(onFieldError).toHaveBeenCalled();
	});

	it("retourne le message en global quand aucun champ ne matche", () => {
		const setFieldError = vi.fn();

		const { result } = renderHook(() =>
			useServerFieldErrors({
				state: validationError("Un produit PUBLIC doit avoir un VARIANT actif"),
				fieldNames: FIELDS,
				setFieldError,
			}),
		);

		expect(result.current).toEqual(["Un produit PUBLIC doit avoir un VARIANT actif"]);
		expect(setFieldError).not.toHaveBeenCalled();
	});

	it("ignore les statuts non-VALIDATION_ERROR (déjà couverts par le toast)", () => {
		const setFieldError = vi.fn();

		const { result } = renderHook(() =>
			useServerFieldErrors({
				state: { status: ActionStatus.ERROR, message: "Erreur serveur" },
				fieldNames: FIELDS,
				setFieldError,
			}),
		);

		expect(result.current).toEqual([]);
		expect(setFieldError).not.toHaveBeenCalled();
	});

	it("ignore un state initial undefined", () => {
		const { result } = renderHook(() =>
			useServerFieldErrors({ state: undefined, fieldNames: FIELDS, setFieldError: vi.fn() }),
		);

		expect(result.current).toEqual([]);
	});

	it("tout est global quand fieldNames est omis", () => {
		const { result } = renderHook(() =>
			useServerFieldErrors({ state: validationError("size: Trop long") }),
		);

		expect(result.current).toEqual(["size: Trop long"]);
	});
});
