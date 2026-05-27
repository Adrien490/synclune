import { describe, it, expect } from "vitest";
import {
	sirenSchema,
	siretSchema,
	vatNumberSchema,
	apeCodeSchema,
	normalizeFiscalIdentifier,
} from "../b2b-identifiers.schema";

describe("sirenSchema", () => {
	it("accepts 9 digits", () => {
		expect(sirenSchema.safeParse("839183027").success).toBe(true);
	});

	it("rejects 8 digits", () => {
		expect(sirenSchema.safeParse("83918302").success).toBe(false);
	});

	it("rejects 10 digits", () => {
		expect(sirenSchema.safeParse("8391830271").success).toBe(false);
	});

	it("rejects spaces (must be normalized first)", () => {
		expect(sirenSchema.safeParse("839 183 027").success).toBe(false);
	});

	it("rejects letters", () => {
		expect(sirenSchema.safeParse("839ABC027").success).toBe(false);
	});
});

describe("siretSchema", () => {
	it("accepts 14 digits", () => {
		expect(siretSchema.safeParse("83918302700037").success).toBe(true);
	});

	it("rejects 9 digits (SIREN instead of SIRET)", () => {
		expect(siretSchema.safeParse("839183027").success).toBe(false);
	});

	it("rejects spaces", () => {
		expect(siretSchema.safeParse("839 183 027 00037").success).toBe(false);
	});
});

describe("vatNumberSchema", () => {
	it("accepts standard French VAT (FR + 2 digits + SIREN)", () => {
		expect(vatNumberSchema.safeParse("FR35839183027").success).toBe(true);
	});

	it("accepts French VAT with letter key", () => {
		expect(vatNumberSchema.safeParse("FR3A839183027").success).toBe(true);
	});

	it("accepts other EU countries (DE, IT, etc.)", () => {
		expect(vatNumberSchema.safeParse("DE123456789").success).toBe(true);
		expect(vatNumberSchema.safeParse("IT12345678901").success).toBe(true);
	});

	it("rejects missing country prefix", () => {
		expect(vatNumberSchema.safeParse("35839183027").success).toBe(false);
	});

	it("rejects lowercase prefix", () => {
		expect(vatNumberSchema.safeParse("fr35839183027").success).toBe(false);
	});
});

describe("apeCodeSchema", () => {
	it("accepts NN.NNL format", () => {
		expect(apeCodeSchema.safeParse("47.91B").success).toBe(true);
	});

	it("rejects missing dot", () => {
		expect(apeCodeSchema.safeParse("4791B").success).toBe(false);
	});

	it("rejects lowercase trailing letter", () => {
		expect(apeCodeSchema.safeParse("47.91b").success).toBe(false);
	});
});

describe("normalizeFiscalIdentifier", () => {
	it("returns null for null/undefined/empty", () => {
		expect(normalizeFiscalIdentifier(null)).toBeNull();
		expect(normalizeFiscalIdentifier(undefined)).toBeNull();
		expect(normalizeFiscalIdentifier("")).toBeNull();
		expect(normalizeFiscalIdentifier("   ")).toBeNull();
	});

	it("strips spaces from SIREN input", () => {
		expect(normalizeFiscalIdentifier("839 183 027")).toBe("839183027");
	});

	it("strips spaces from SIRET input", () => {
		expect(normalizeFiscalIdentifier("839 183 027 00037")).toBe("83918302700037");
	});

	it("strips dots from APE-like input", () => {
		expect(normalizeFiscalIdentifier("47.91B")).toBe("4791B");
	});

	it("uppercases VAT prefix and key", () => {
		expect(normalizeFiscalIdentifier("fr35839183027")).toBe("FR35839183027");
	});

	it("produces input that passes sirenSchema", () => {
		const raw = "839 183 027";
		const normalized = normalizeFiscalIdentifier(raw)!;
		expect(sirenSchema.safeParse(normalized).success).toBe(true);
	});

	it("produces input that passes siretSchema", () => {
		const raw = "839 183 027 00037";
		const normalized = normalizeFiscalIdentifier(raw)!;
		expect(siretSchema.safeParse(normalized).success).toBe(true);
	});

	it("produces input that passes vatNumberSchema", () => {
		const raw = "fr 35 839 183 027";
		const normalized = normalizeFiscalIdentifier(raw)!;
		expect(vatNumberSchema.safeParse(normalized).success).toBe(true);
	});
});
