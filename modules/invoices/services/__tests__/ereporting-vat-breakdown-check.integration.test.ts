/**
 * @regression ereporting-vat-breakdown-check
 *
 * Valide le comportement Postgres RÉEL du CHECK `vatBreakdown_isarray`
 * (`jsonb_typeof = 'array'`) ajouté par la migration 20260529140000
 * (EINV-EREPORT-007). Ne peut PAS être un mock : la sémantique testée est celle
 * du moteur Postgres.
 *
 * ⚠️ Le setup d'intégration initialise la DB via `prisma db push` (schema.prisma,
 * DDL only) qui n'applique PAS les CHECK définis en SQL brut dans les migrations.
 * On ré-applique donc ici la contrainte EXACTE de la migration avant d'asserter.
 * On cible `EReportingBatch` (mêmes sémantiques de CHECK que la transaction, mais
 * sans FK source ni source_xor à satisfaire → insertion minimale).
 *
 * Skip silencieux si `INTEGRATION_DATABASE_URL` absent.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("EReportingBatch.vatBreakdown CHECK — Postgres réel", () => {
	const prisma = getIntegrationPrismaClient();
	const periodFrom = new Date("2026-09-01T00:00:00.000Z");
	const periodTo = new Date("2026-09-02T00:00:00.000Z");

	beforeAll(async () => {
		// Réplique la contrainte de la migration (absente du db push schema-only).
		await prisma.$executeRawUnsafe(
			`ALTER TABLE "EReportingBatch" DROP CONSTRAINT IF EXISTS "EReportingBatch_vatBreakdown_isarray"`,
		);
		await prisma.$executeRawUnsafe(
			`ALTER TABLE "EReportingBatch" ADD CONSTRAINT "EReportingBatch_vatBreakdown_isarray" ` +
				`CHECK ("vatBreakdown" IS NULL OR jsonb_typeof("vatBreakdown") = 'array')`,
		);
	});

	it("accepte un tableau JSON valide", async () => {
		const batch = await prisma.eReportingBatch.create({
			data: {
				periodFrom,
				periodTo,
				vatBreakdown: [{ rate: 2000, baseExclTax: 5000, taxAmount: 1000 }],
			},
			select: { id: true },
		});
		expect(batch.id).toBeTruthy();
	});

	it("accepte null (franchise art. 293 B)", async () => {
		const batch = await prisma.eReportingBatch.create({
			data: { periodFrom, periodTo },
			select: { id: true },
		});
		expect(batch.id).toBeTruthy();
	});

	it("rejette un objet JSON non-tableau (CHECK jsonb_typeof = 'array')", async () => {
		await expect(
			prisma.eReportingBatch.create({
				data: {
					periodFrom,
					periodTo,
					// Objet (jsonb_typeof = 'object') → doit violer le CHECK.
					vatBreakdown: { rate: 2000, baseExclTax: 5000, taxAmount: 1000 },
				},
			}),
		).rejects.toThrow();
	});
});
