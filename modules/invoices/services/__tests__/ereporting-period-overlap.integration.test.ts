/**
 * @regression ereporting-period-no-overlap-2026-05-29
 *
 * EINV-EREPORT-006 — Vérifie contre un VRAI Postgres que l'exclusion constraint
 * `EReportingPeriod_no_overlap` :
 *   1. REJETTE deux périodes qui se chevauchent (double déclaration DGFiP) ;
 *   2. ACCEPTE deux périodes contiguës `[J, J+1)` + `[J+1, J+2)` (ni trou, ni
 *      overlap — la borne haute exclusive '[)' évite le faux conflit) ;
 *   3. ACCEPTE plusieurs `EReportingBatch` (cap-split EINV-EREPORT-005) rattachés
 *      à la MÊME période — la contrainte vit sur la période, pas sur le batch.
 *
 * `prisma db push` (setup intégration) n'applique PAS les contraintes raw-SQL :
 * le `beforeAll` ci-dessous pose donc lui-même l'EXCLUDE (idempotent) comme le
 * ferait la migration `20260529130000_add_ereporting_period_exclusion`.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { EReportingStatus } from "@/app/generated/prisma/client";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describeIntegration("EReportingPeriod_no_overlap — exclusion constraint (Postgres réel)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	beforeAll(async () => {
		prisma = getIntegrationPrismaClient();
		// db push n'inclut pas l'EXCLUDE raw-SQL → on la pose ici, idempotente.
		await prisma.$executeRawUnsafe(
			`ALTER TABLE "EReportingPeriod" DROP CONSTRAINT IF EXISTS "EReportingPeriod_no_overlap"`,
		);
		await prisma.$executeRawUnsafe(
			`ALTER TABLE "EReportingPeriod"
			 ADD CONSTRAINT "EReportingPeriod_no_overlap"
			 EXCLUDE USING gist (tsrange("periodFrom", "periodTo", '[)') WITH &&)`,
		);
	});

	beforeEach(() => {
		prisma = getIntegrationPrismaClient();
	});

	it("REJETTE deux périodes qui se chevauchent", async () => {
		await prisma.eReportingPeriod.create({
			data: { periodFrom: day("2026-01-01"), periodTo: day("2026-01-03") },
		});

		await expect(
			prisma.eReportingPeriod.create({
				// [01-02, 01-04) chevauche [01-01, 01-03)
				data: { periodFrom: day("2026-01-02"), periodTo: day("2026-01-04") },
			}),
		).rejects.toThrow(/exclusion|23P01|EReportingPeriod_no_overlap/i);
	});

	it("ACCEPTE deux périodes contiguës (ni trou, ni overlap)", async () => {
		const a = await prisma.eReportingPeriod.create({
			data: { periodFrom: day("2026-02-01"), periodTo: day("2026-02-02") },
		});
		const b = await prisma.eReportingPeriod.create({
			// periodFrom de b = periodTo de a → adjacence exclue par '[)', pas de conflit.
			data: { periodFrom: day("2026-02-02"), periodTo: day("2026-02-03") },
		});

		expect(a.id).toBeTruthy();
		expect(b.id).toBeTruthy();
	});

	it("ACCEPTE plusieurs batches (cap-split) rattachés à la même période", async () => {
		const period = await prisma.eReportingPeriod.create({
			data: { periodFrom: day("2026-03-01"), periodTo: day("2026-03-02") },
		});

		const makeBatch = () =>
			prisma.eReportingBatch.create({
				data: {
					periodId: period.id,
					periodFrom: period.periodFrom,
					periodTo: period.periodTo,
					status: EReportingStatus.PENDING,
					transactionCount: 1,
				},
				select: { id: true },
			});

		const batch1 = await makeBatch();
		const batch2 = await makeBatch();

		expect(batch1.id).not.toBe(batch2.id);
		const count = await prisma.eReportingBatch.count({ where: { periodId: period.id } });
		expect(count).toBe(2);
	});
});
