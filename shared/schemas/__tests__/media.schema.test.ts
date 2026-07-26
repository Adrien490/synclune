import { describe, it, expect } from "vitest";
import { baseMediaSchema, imageMediaSchema, nullableImageMediaSchema } from "../media.schema";
import { TEXT_LIMITS } from "@/shared/constants/validation-limits";

// utfs.io is in UPLOADTHING_DOMAINS, which is the default for isAllowedMediaDomain
const VALID_URL = "https://utfs.io/f/image123.jpg";
const INVALID_DOMAIN_URL = "https://evil.com/image.jpg";

describe("baseMediaSchema", () => {
	it("should accept a valid media object with an allowed URL", () => {
		const result = baseMediaSchema.safeParse({ url: VALID_URL });
		expect(result.success).toBe(true);
	});

	it("should accept a valid media object with optional blurDataUrl and altText", () => {
		const result = baseMediaSchema.safeParse({
			url: VALID_URL,
			blurDataUrl: "data:image/jpeg;base64,/9j/...",
			altText: "A beautiful necklace",
		});
		expect(result.success).toBe(true);
	});

	it("should accept null blurDataUrl and altText", () => {
		const result = baseMediaSchema.safeParse({
			url: VALID_URL,
			blurDataUrl: null,
			altText: null,
		});
		expect(result.success).toBe(true);
	});

	it("should reject an invalid URL format", () => {
		const result = baseMediaSchema.safeParse({ url: "not-a-url" });
		expect(result.success).toBe(false);
	});

	it("should reject a URL from a non-allowed domain", () => {
		const result = baseMediaSchema.safeParse({ url: INVALID_DOMAIN_URL });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain("domaine autorisé");
		}
	});

	it("should reject altText exceeding the shared limit", () => {
		const result = baseMediaSchema.safeParse({
			url: VALID_URL,
			altText: "a".repeat(TEXT_LIMITS.MEDIA_ALT_TEXT.max + 1),
		});
		expect(result.success).toBe(false);
	});

	// Audit média M3 : le dialogue d'édition, ce schéma et `imageSchema` (produits)
	// bloquaient à 250 / 255 / 200 respectivement. Un alt text de 220 caractères
	// était « enregistré » dans le dialogue puis faisait échouer la sauvegarde du
	// produit. Cette borne doit rester dérivée de la SSOT.
	it("accepts altText exactly at the shared limit (SSOT alignment)", () => {
		const result = baseMediaSchema.safeParse({
			url: VALID_URL,
			altText: "a".repeat(TEXT_LIMITS.MEDIA_ALT_TEXT.max),
		});
		expect(result.success).toBe(true);
	});

	it("should reject when url is missing", () => {
		const result = baseMediaSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

describe("imageMediaSchema", () => {
	it("should accept a valid image media object", () => {
		const result = imageMediaSchema.safeParse({
			url: VALID_URL,
			thumbnailUrl: "https://utfs.io/f/thumb123.jpg",
			mediaType: "IMAGE",
		});
		expect(result.success).toBe(true);
	});

	it("should accept mediaType VIDEO", () => {
		const result = imageMediaSchema.safeParse({
			url: VALID_URL,
			mediaType: "VIDEO",
		});
		expect(result.success).toBe(true);
	});

	it("should accept when thumbnailUrl is undefined", () => {
		const result = imageMediaSchema.safeParse({ url: VALID_URL });
		expect(result.success).toBe(true);
	});

	it("should accept when thumbnailUrl is null", () => {
		const result = imageMediaSchema.safeParse({
			url: VALID_URL,
			thumbnailUrl: null,
		});
		expect(result.success).toBe(true);
	});

	it("should reject a thumbnailUrl from a non-allowed domain", () => {
		const result = imageMediaSchema.safeParse({
			url: VALID_URL,
			thumbnailUrl: INVALID_DOMAIN_URL,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0]?.message).toContain("domaine autorisé");
		}
	});

	it("should reject an unknown mediaType", () => {
		const result = imageMediaSchema.safeParse({
			url: VALID_URL,
			mediaType: "GIF",
		});
		expect(result.success).toBe(false);
	});
});

describe("nullableImageMediaSchema", () => {
	it("should accept a valid image media object", () => {
		const result = nullableImageMediaSchema.safeParse({ url: VALID_URL });
		expect(result.success).toBe(true);
	});

	it("should accept null (allows deletion)", () => {
		const result = nullableImageMediaSchema.safeParse(null);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toBeNull();
		}
	});

	it("should reject undefined", () => {
		const result = nullableImageMediaSchema.safeParse(undefined);
		expect(result.success).toBe(false);
	});
});
