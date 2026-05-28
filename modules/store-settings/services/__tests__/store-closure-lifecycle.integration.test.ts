/**
 * @regression store-audit-004 — Cycle de vie fermeture → réouverture auto (DB réelle)
 *
 * Garde-fou : le cron `reopen-store` (`autoReopenIfDue`) doit, contre une vraie
 * Postgres, (1) rouvrir la boutique quand `reopensAt` est échu, (2) ne RIEN
 * faire quand `reopensAt` est futur ou null, (3) ne RIEN faire quand la boutique
 * est déjà ouverte, (4) être idempotent (2e passage = no-op). Les tests unitaires
 * mockent Prisma ; ici on valide la sémantique atomique réelle du
 * `updateMany WHERE isClosed=true AND reopensAt<=now AND reopensAt IS NOT NULL`.
 *
 * Pré-requis : INTEGRATION_DATABASE_URL pointant sur une DB Postgres dédiée
 * (cf test/integration/setup.ts). Skip silencieux sinon.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";

// updateTag (next/cache) n'est pas disponible hors runtime Next → no-op.
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));

import { autoReopenIfDue } from "../auto-reopen.service";

const SINGLETON_ID = "store-settings-singleton";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("store closure lifecycle — auto-reopen (integration)", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;

	async function seedSettings(data: {
		isClosed: boolean;
		reopensAt: Date | null;
		closureMessage?: string | null;
	}) {
		await prisma.storeSettings.upsert({
			where: { id: SINGLETON_ID },
			create: {
				id: SINGLETON_ID,
				isClosed: data.isClosed,
				reopensAt: data.reopensAt,
				closureMessage: data.closureMessage ?? (data.isClosed ? "Fermé" : null),
				closedAt: data.isClosed ? new Date() : null,
				closedBy: data.isClosed ? "test-admin" : null,
			},
			update: {
				isClosed: data.isClosed,
				reopensAt: data.reopensAt,
				closureMessage: data.closureMessage ?? (data.isClosed ? "Fermé" : null),
				closedAt: data.isClosed ? new Date() : null,
				closedBy: data.isClosed ? "test-admin" : null,
			},
		});
	}

	beforeEach(async () => {
		prisma = getIntegrationPrismaClient();
		// StoreSettings n'est pas dans la liste TRUNCATE du setup → on remet le
		// singleton à un état déterministe avant chaque test.
		await seedSettings({ isClosed: false, reopensAt: null });
	});

	it("reopens the store when reopensAt is in the past", async () => {
		const past = new Date(Date.now() - 60 * 60 * 1000); // -1h
		await seedSettings({ isClosed: true, reopensAt: past, closureMessage: "Congés" });

		const result = await autoReopenIfDue();

		expect(result.reopened).toBe(true);
		expect(result.processed).toBe(1);

		const settings = await prisma.storeSettings.findUnique({ where: { id: SINGLETON_ID } });
		expect(settings?.isClosed).toBe(false);
		expect(settings?.reopensAt).toBeNull();
		expect(settings?.closureMessage).toBeNull();
		expect(settings?.closedAt).toBeNull();
		expect(settings?.closedBy).toBeNull();
	});

	it("does NOT reopen when reopensAt is still in the future", async () => {
		const future = new Date(Date.now() + 60 * 60 * 1000); // +1h
		await seedSettings({ isClosed: true, reopensAt: future });

		const result = await autoReopenIfDue();

		expect(result.reopened).toBe(false);
		const settings = await prisma.storeSettings.findUnique({ where: { id: SINGLETON_ID } });
		expect(settings?.isClosed).toBe(true);
	});

	it("does NOT reopen when reopensAt is null (manual reopen only)", async () => {
		await seedSettings({ isClosed: true, reopensAt: null });

		const result = await autoReopenIfDue();

		expect(result.reopened).toBe(false);
		const settings = await prisma.storeSettings.findUnique({ where: { id: SINGLETON_ID } });
		expect(settings?.isClosed).toBe(true);
	});

	it("is a no-op when the store is already open", async () => {
		await seedSettings({ isClosed: false, reopensAt: null });

		const result = await autoReopenIfDue();

		expect(result.reopened).toBe(false);
		expect(result.processed).toBe(0);
	});

	it("is idempotent — a second pass after reopening does nothing", async () => {
		const past = new Date(Date.now() - 60 * 60 * 1000);
		await seedSettings({ isClosed: true, reopensAt: past });

		const first = await autoReopenIfDue();
		const second = await autoReopenIfDue();

		expect(first.reopened).toBe(true);
		expect(second.reopened).toBe(false);
		expect(second.processed).toBe(0);
	});
});
