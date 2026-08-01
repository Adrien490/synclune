/**
 * @regression post-webhook-tasks-route-context-2026-07-31
 *
 * ⚠️ Ce fichier NE MOCKE NI `next/cache` NI `@/shared/lib/cache`. C'est le seul
 * test du repo qui exécute la branche `INVALIDATE_CACHE` avec la VRAIE API
 * d'invalidation Next, dans un contexte d'exécution réaliste.
 *
 * Le bug qu'il verrouille (audit « usage correct du cache Next.js » 2026-07-31) :
 * `runPostWebhookTasks` est le SEUL point d'exécution des tags émis par tous les
 * handlers Stripe (`payment-handlers`, `refund-handlers`, `checkout-post-tasks`).
 * Il tourne dans un `after()` de `app/api/webhooks/stripe/route.ts` et dans le cron
 * `retry-post-webhook-tasks` — deux route handlers. Or `updateTag` throw hors
 * Server Action (E872, cf. `revalidate.js:53`), et le `try/catch` par tâche avalait
 * le throw : la task passait `FAILED`, le cron la rejouait depuis un route handler
 * lui aussi → `FAILED` en boucle jusqu'à épuisement des tentatives.
 *
 * Résultat en production : AUCUNE invalidation après un paiement. `orders-list`,
 * `order-detail-*`, `sku-stock-*`, `product-<slug>`, `admin-badges` restaient
 * périmés jusqu'à expiration du profil — jusqu'à 6 h pour le stock vitrine
 * (`catalog.expire = 21600`).
 *
 * Pourquoi aucun test ne l'a vu : `post-webhook-tasks.service.test.ts` (comme 246
 * autres fichiers) fait `vi.mock("next/cache")`, où `updateTag` est un `vi.fn()`
 * qui ne throw jamais. Le test passait au vert sur exactement le code cassé.
 *
 * L'assertion qui compte est donc `status: COMPLETED` : c'est elle qui distingue
 * « les tags ont été invalidés » de « la task a échoué en silence ».
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import type * as WorkStorageModule from "next/dist/server/app-render/work-async-storage.external.js";

// Next crée ses AsyncLocalStorage via `globalThis.AsyncLocalStorage`, injecté par
// son bootstrap runtime (absent sous Vitest). Sans ça, tout accès au store lève
// `E504 Invariant: AsyncLocalStorage accessed in runtime where it is not available`
// au lieu de la vraie contrainte — le test échouerait (ou passerait) pour de
// mauvaises raisons : on croirait vérifier E872 en observant E504.
//
// ⚠️ `vi.hoisted` est OBLIGATOIRE ici : les instances ALS de Next sont créées au
// chargement du module, et la chaîne d'import statique
// (`post-webhook-tasks.service` → `@/shared/lib/cache` → `next/cache`) est évaluée
// AVANT le corps du fichier. Une affectation en top-level arriverait trop tard.
// eslint-disable-next-line @typescript-eslint/no-floating-promises -- vi.hoisted résout lui-même sa factory async avant les imports du module
vi.hoisted(async () => {
	const { AsyncLocalStorage } = await import("node:async_hooks");
	globalThis.AsyncLocalStorage = AsyncLocalStorage;
});

const { mockPrisma, mockDispatchEmailTask } = vi.hoisted(() => ({
	mockPrisma: {
		postWebhookTask: { findMany: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
	},
	mockDispatchEmailTask: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("@/shared/lib/logger", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock("@/modules/emails/services/admin-emails", () => ({
	sendWebhookFailedAlertEmail: vi.fn(),
}));
vi.mock("../../utils/dispatch-email-task", () => ({
	dispatchEmailTask: mockDispatchEmailTask,
	CRITICAL_EMAIL_TASKS: new Set(["ORDER_CONFIRMATION_EMAIL"]),
}));
vi.mock("@/app/generated/prisma/client", () => ({
	PostWebhookTaskStatus: { PENDING: "PENDING", COMPLETED: "COMPLETED", FAILED: "FAILED" },
}));

import { executeBatch } from "../post-webhook-tasks.service";

let workAsyncStorage: typeof WorkStorageModule.workAsyncStorage;

/** Contexte réel du runner : `after()` du webhook Stripe, ou cron de rejeu. */
const WEBHOOK_ROUTE_PAGE = "/api/webhooks/stripe/route";
const RETRY_CRON_PAGE = "/api/cron/retry-post-webhook-tasks/route";

function makeWorkStore(page: string) {
	return { page, route: page, incrementalCache: {}, cacheLifeProfiles: {} };
}

function runInRouteHandler<T>(page: string, fn: () => Promise<T>): Promise<T> {
	// Le type interne du work store Next n'est pas exporté : on n'en fournit que
	// les champs lus par `revalidate()` (`page` + `incrementalCache`).
	return workAsyncStorage.run(
		makeWorkStore(page) as unknown as Parameters<typeof workAsyncStorage.run>[0],
		fn,
	);
}

const cacheTaskRow = {
	id: "task-cache",
	taskType: "INVALIDATE_CACHE",
	payload: { tags: ["orders-list", "sku-stock-abc", "admin-badges"] },
	attempts: 0,
};

beforeAll(async () => {
	const storageModule = await import("next/dist/server/app-render/work-async-storage.external.js");
	workAsyncStorage = storageModule.workAsyncStorage;
});

beforeEach(() => {
	vi.clearAllMocks();
	// Claim optimiste gagnant (IDEM-TASK-001) — sinon la task est « skipped ».
	mockPrisma.postWebhookTask.updateMany.mockResolvedValue({ count: 1 });
	mockPrisma.postWebhookTask.update.mockResolvedValue({});
});

describe("runPostWebhookTasks — INVALIDATE_CACHE en contexte route handler (sans mock next/cache)", () => {
	it("termine COMPLETED depuis le `after()` du webhook Stripe", async () => {
		const stats = await runInRouteHandler(WEBHOOK_ROUTE_PAGE, () => executeBatch([cacheTaskRow]));

		expect(stats).toEqual({ successful: 1, failed: 0, skipped: 0 });
		expect(mockPrisma.postWebhookTask.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "task-cache" },
				data: expect.objectContaining({ status: "COMPLETED" }),
			}),
		);
	});

	it("termine COMPLETED depuis le cron de rejeu", async () => {
		const stats = await runInRouteHandler(RETRY_CRON_PAGE, () => executeBatch([cacheTaskRow]));

		expect(stats).toEqual({ successful: 1, failed: 0, skipped: 0 });
	});

	it("n'a pas emprunté le chemin email", async () => {
		await runInRouteHandler(WEBHOOK_ROUTE_PAGE, () => executeBatch([cacheTaskRow]));

		expect(mockDispatchEmailTask).not.toHaveBeenCalled();
	});

	it("CONTRE-ÉPREUVE — `updateTag` throw bien dans ce contexte (sinon ce test est vide de sens)", async () => {
		// Sans cette assertion, les trois tests ci-dessus resteraient verts même si
		// Next levait un jour la restriction : on ne saurait pas s'ils prouvent quoi
		// que ce soit. C'est le garde-fou du garde-fou.
		const { updateTag } = await import("next/dist/server/web/spec-extension/revalidate.js");

		await expect(
			runInRouteHandler(WEBHOOK_ROUTE_PAGE, async () => updateTag("orders-list")),
		).rejects.toThrow(/updateTag can only be called from within a Server Action/);
	});
});
