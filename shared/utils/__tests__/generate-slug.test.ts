import { describe, it, expect, vi } from "vitest";
import { slugify, generateSlug, type PrismaClientOrTransaction } from "../generate-slug";
import { SLUG_MAX_LENGTH } from "@/shared/constants/slug-patterns";

describe("slugify", () => {
	it("converts to lowercase", () => {
		expect(slugify("HELLO WORLD")).toBe("hello-world");
	});

	it("replaces spaces with dashes", () => {
		expect(slugify("bague en or")).toBe("bague-en-or");
	});

	it("removes accents", () => {
		expect(slugify("Été 2024")).toBe("ete-2024");
		expect(slugify("Édition Limitée")).toBe("edition-limitee");
	});

	it("handles French ligatures", () => {
		expect(slugify("cœur")).toBe("coeur");
		expect(slugify("æther")).toBe("aether");
	});

	it("removes non-alphanumeric characters", () => {
		expect(slugify("prix: 50€!")).toBe("prix-50");
	});

	it("collapses multiple dashes into one", () => {
		expect(slugify("hello---world")).toBe("hello-world");
	});

	it("trims leading and trailing dashes", () => {
		expect(slugify("  -hello world-  ")).toBe("hello-world");
	});

	it("preserves numbers", () => {
		expect(slugify("Argent 925")).toBe("argent-925");
	});
});

describe("generateSlug", () => {
	function makeMockPrisma(findResults: Record<string, unknown> = {}) {
		const mockFindUnique = vi.fn().mockImplementation(({ where }) => {
			return findResults[where.slug] ?? null;
		});
		return {
			product: { findUnique: mockFindUnique },
			collection: { findUnique: mockFindUnique },
			productType: { findUnique: mockFindUnique },
			color: { findUnique: mockFindUnique },
			material: { findUnique: mockFindUnique },
		};
	}

	it("returns unique slug on first attempt", async () => {
		const prisma = makeMockPrisma() as unknown as PrismaClientOrTransaction;
		const result = await generateSlug(prisma, "product", "Bague en Or");
		expect(result).toBe("bague-en-or");
	});

	it("appends -2 when slug already exists", async () => {
		const prisma = makeMockPrisma({
			"bague-en-or": { id: "1" },
		}) as unknown as PrismaClientOrTransaction;
		const result = await generateSlug(prisma, "product", "Bague en Or");
		expect(result).toBe("bague-en-or-2");
	});

	it("increments suffix until unique", async () => {
		const prisma = makeMockPrisma({
			bague: { id: "1" },
			"bague-2": { id: "2" },
			"bague-3": { id: "3" },
		}) as unknown as PrismaClientOrTransaction;
		const result = await generateSlug(prisma, "product", "Bague");
		expect(result).toBe("bague-4");
	});

	// Sur un UPDATE, l'enregistrement édité ne compte pas comme collision :
	// sans `excludeId`, « Or rose » → « Or Rose » retrouvait son PROPRE slug
	// et retournait « or-rose-2 » — l'URL changeait sans raison.
	it("keeps the record's own slug on a cosmetic rename (excludeId)", async () => {
		const prisma = makeMockPrisma({
			"or-rose": { id: "color-1" },
		}) as unknown as PrismaClientOrTransaction;
		const result = await generateSlug(prisma, "color", "Or Rose", { excludeId: "color-1" });
		expect(result).toBe("or-rose");
	});

	it("still suffixes when the colliding slug belongs to ANOTHER record", async () => {
		const prisma = makeMockPrisma({
			"or-rose": { id: "color-OTHER" },
		}) as unknown as PrismaClientOrTransaction;
		const result = await generateSlug(prisma, "color", "Or Rose", { excludeId: "color-1" });
		expect(result).toBe("or-rose-2");
	});

	it("truncates slug exceeding max length", async () => {
		const longName = "a".repeat(SLUG_MAX_LENGTH + 20);
		const prisma = makeMockPrisma() as unknown as PrismaClientOrTransaction;
		const result = await generateSlug(prisma, "product", longName);
		expect(result.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
	});

	it("throws on empty value", async () => {
		const prisma = makeMockPrisma() as unknown as PrismaClientOrTransaction;
		await expect(generateSlug(prisma, "product", "")).rejects.toThrow(
			"La valeur pour générer le slug ne peut pas être vide",
		);
	});

	it("throws on whitespace-only value", async () => {
		const prisma = makeMockPrisma() as unknown as PrismaClientOrTransaction;
		await expect(generateSlug(prisma, "product", "   ")).rejects.toThrow();
	});

	it("works with collection model", async () => {
		const rawPrisma = makeMockPrisma();
		const prisma = rawPrisma as unknown as PrismaClientOrTransaction;
		const result = await generateSlug(prisma, "collection", "Été 2024");
		expect(result).toBe("ete-2024");
		expect(rawPrisma.collection.findUnique).toHaveBeenCalled();
	});

	it("works with productType model", async () => {
		const rawPrisma = makeMockPrisma();
		const prisma = rawPrisma as unknown as PrismaClientOrTransaction;
		await generateSlug(prisma, "productType", "Colliers");
		expect(rawPrisma.productType.findUnique).toHaveBeenCalled();
	});

	it("works with color model", async () => {
		const rawPrisma = makeMockPrisma();
		const prisma = rawPrisma as unknown as PrismaClientOrTransaction;
		await generateSlug(prisma, "color", "Or Rose");
		expect(rawPrisma.color.findUnique).toHaveBeenCalled();
	});

	it("works with material model", async () => {
		const rawPrisma = makeMockPrisma();
		const prisma = rawPrisma as unknown as PrismaClientOrTransaction;
		await generateSlug(prisma, "material", "Argent 925");
		expect(rawPrisma.material.findUnique).toHaveBeenCalled();
	});
});
