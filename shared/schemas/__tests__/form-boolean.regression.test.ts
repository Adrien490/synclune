/**
 * @regression form-boolean-false-string
 *
 * F5 (audit validation Zod 2026-07-06) — `z.coerce.boolean()` coerçait toute
 * chaîne non vide en `true`, y compris `"false"` : un filtre admin
 * `?filter_invoiceAnomaly=false` ACTIVAIT le preset, et les anciens tests
 * verrouillaient ce comportement piégeux.
 *
 * Verrouille le contrat de `formBooleanSchema` (union boolean | stringbool).
 */
import { describe, it, expect } from "vitest";
import { formBooleanSchema } from "../boolean.schema";

describe("formBooleanSchema (regression)", () => {
	it('"false" → false (LE bug verrouillé : coerce donnait true)', () => {
		const result = formBooleanSchema.safeParse("false");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe(false);
	});

	it('"true" → true', () => {
		const result = formBooleanSchema.safeParse("true");
		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toBe(true);
	});

	it("variantes stringbool acceptées (0/1, on/off, case-insensitive)", () => {
		expect(formBooleanSchema.parse("0")).toBe(false);
		expect(formBooleanSchema.parse("1")).toBe(true);
		expect(formBooleanSchema.parse("off")).toBe(false);
		expect(formBooleanSchema.parse("on")).toBe(true);
		expect(formBooleanSchema.parse("FALSE")).toBe(false);
	});

	it("booléens natifs passthrough (producteurs qui normalisent en amont)", () => {
		expect(formBooleanSchema.parse(true)).toBe(true);
		expect(formBooleanSchema.parse(false)).toBe(false);
	});

	it('""/garbage/null → erreur de validation (plus de true silencieux)', () => {
		expect(formBooleanSchema.safeParse("").success).toBe(false);
		expect(formBooleanSchema.safeParse("garbage").success).toBe(false);
		expect(formBooleanSchema.safeParse(null).success).toBe(false);
		expect(formBooleanSchema.safeParse(undefined).success).toBe(false);
	});

	it("absent → default via .default() (usage schémas produits/variants)", () => {
		const withDefault = formBooleanSchema.default(true);
		expect(withDefault.parse(undefined)).toBe(true);
		const withDefaultFalse = formBooleanSchema.default(false);
		expect(withDefaultFalse.parse(undefined)).toBe(false);
	});
});
