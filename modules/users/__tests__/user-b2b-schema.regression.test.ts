import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression user-b2b-fields-2026-05-27
 *
 * Verrouille la présence des champs B2B sur le modèle `User`. Sans ces
 * champs (Phase 2A — EINV-AUDIT-001), Synclune ne peut pas émettre de
 * factures conformes à un client professionnel ou public à partir du
 * 1ᵉʳ septembre 2027.
 *
 * Le test lit `schema.prisma` directement plutôt que `Prisma.dmmf` —
 * Prisma 7 / "small" compilerBuild n'expose pas dmmf.
 */
describe("User model — B2B/B2G fields (Art. 286 CGI, 2026-2027)", () => {
	const schemaPath = join(process.cwd(), "prisma", "schema.prisma");
	const schema = readFileSync(schemaPath, "utf-8");

	function extractModel(name: string): string {
		const match = schema.match(new RegExp(`model\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"));
		if (!match) throw new Error(`Model ${name} not found in schema.prisma`);
		return match[1]!;
	}

	const user = extractModel("User");

	it("declares CustomerType enum", () => {
		expect(schema).toMatch(/enum\s+CustomerType\s*\{[\s\S]*?B2C[\s\S]*?B2B[\s\S]*?B2G[\s\S]*?\}/);
	});

	it("User.customerType has default B2C (backward compat)", () => {
		expect(user).toMatch(/^\s*customerType\s+CustomerType\s+@default\(B2C\)/m);
	});

	it("User.companyName is nullable VarChar(255)", () => {
		expect(user).toMatch(/^\s*companyName\s+String\?\s+@db\.VarChar\(255\)/m);
	});

	it("User.companySiren is nullable VarChar(9)", () => {
		expect(user).toMatch(/^\s*companySiren\s+String\?\s+@db\.VarChar\(9\)/m);
	});

	it("User.companySiret is nullable VarChar(14)", () => {
		expect(user).toMatch(/^\s*companySiret\s+String\?\s+@db\.VarChar\(14\)/m);
	});

	it("User.companyVatNumber is nullable VarChar(15)", () => {
		expect(user).toMatch(/^\s*companyVatNumber\s+String\?\s+@db\.VarChar\(15\)/m);
	});

	it("admin listing index covers customerType + deletedAt", () => {
		expect(user).toMatch(/@@index\(\[customerType,\s*deletedAt\]\)/);
	});
});
