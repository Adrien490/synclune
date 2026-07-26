/**
 * @regression webhook-global-ip-limit-bypass-2026-07-26
 *
 * WEBHOOK-AUDIT-003 — `STRIPE_WEBHOOK_LIMIT` (1000 req/min) était purement
 * décoratif.
 *
 * `checkRateLimitInMemory` évalue le plafond transverse `GLOBAL_IP_LIMIT`
 * (100 req/min/IP) AVANT la limite par action, et la route webhook lui passe
 * explicitement l'IP résolue. Le plafond effectif restait donc 100/min par IP
 * Stripe — le relèvement 100 → 1000 de WEBHOOK-AUDIT-002, justifié à l'époque par
 * un « headroom » face aux rafales Stripe, n'avait aucun effet.
 *
 * La rafale est un cas réel, pas théorique : un seul remboursement émet 4
 * événements (`charge.refunded`, `refund.created`, `refund.updated`,
 * `charge.refund.updated`), donc ~25 remboursements dans la minute franchissaient
 * le seuil et déclenchaient un 429 → backoff Stripe inutile sur des événements
 * revenu-critiques, avec un `WebhookEvent.attempts` gonflé au passage.
 *
 * Symptôme révélateur du bug d'origine : quand la résolution d'IP ÉCHOUAIT, le
 * bloc global était court-circuité (`if (ipAddress)`) et la limite voulue
 * s'appliquait — l'endpoint était donc plus permissif sans IP qu'avec.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockLogger } = vi.hoisted(() => ({
	mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/shared/lib/logger", () => ({ logger: mockLogger }));

import { checkRateLimit } from "../rate-limit";
import { STRIPE_WEBHOOK_LIMIT, PDP_WEBHOOK_LIMIT } from "../rate-limit-config";

beforeEach(() => {
	delete process.env.RATE_LIMIT_WHITELIST;
	delete process.env.RATE_LIMIT_BLACKLIST;
	vi.clearAllMocks();
});

// Le store global est un Map au niveau module, sans reset exporté : chaque test
// utilise une IP distincte pour ne pas hériter du compteur d'un autre.
describe("@regression webhook-global-ip-limit-bypass — exemption du plafond transverse", () => {
	it("les deux configs webhook déclarent skipGlobalIpLimit", () => {
		// Sans ce flag, la `limit` déclarée ci-dessous est inatteignable.
		expect(STRIPE_WEBHOOK_LIMIT.skipGlobalIpLimit).toBe(true);
		expect(PDP_WEBHOOK_LIMIT.skipGlobalIpLimit).toBe(true);
	});

	it("laisse passer 150 livraisons Stripe depuis une même IP (le plafond global était à 100)", async () => {
		const ip = "10.0.0.150";
		const results = [];
		for (let i = 0; i < 150; i++) {
			results.push(await checkRateLimit(`stripe-webhook:${ip}`, STRIPE_WEBHOOK_LIMIT, ip));
		}

		expect(results.every((r) => r.success)).toBe(true);
		// Avant correctif, la 101ᵉ basculait sur le plafond global.
		expect(results[100]!.success).toBe(true);
		expect(results[149]!.limit).toBe(1000);
	});

	it("applique toujours la limite PAR ACTION une fois celle-ci atteinte", async () => {
		// L'exemption ne doit pas transformer l'endpoint en passe-droit : le
		// garde-fou anti-CPU-drain reste la limite par action.
		const ip = "10.0.0.151";
		const smallConfig = { limit: 3, windowMs: 60_000, skipGlobalIpLimit: true };

		const allowed = [];
		for (let i = 0; i < 3; i++) {
			allowed.push(await checkRateLimit(`stripe-webhook:${ip}`, smallConfig, ip));
		}
		const blocked = await checkRateLimit(`stripe-webhook:${ip}`, smallConfig, ip);

		expect(allowed.every((r) => r.success)).toBe(true);
		expect(blocked.success).toBe(false);
		expect(blocked.limit).toBe(3);
	});

	it("continue d'appliquer le plafond global aux appelants NON exemptés", async () => {
		// Garde anti-régression inverse : l'exemption doit rester opt-in.
		const ip = "10.0.0.152";
		const results = [];
		for (let i = 0; i < 105; i++) {
			results.push(await checkRateLimit(`some-action:${ip}`, { limit: 1000 }, ip));
		}

		expect(results[99]!.success).toBe(true);
		expect(results[104]!.success).toBe(false);
		expect(results[104]!.limit).toBe(100);
	});

	it("n'exempte PAS de la blacklist", async () => {
		// C'est la raison pour laquelle on passe par un flag plutôt qu'en omettant
		// `ipAddress` à l'appel — omettre l'IP désactiverait aussi ce contrôle.
		vi.resetModules();
		process.env.RATE_LIMIT_BLACKLIST = "10.0.0.153";

		const { checkRateLimit: freshCheck } = await import("../rate-limit");
		const { STRIPE_WEBHOOK_LIMIT: freshConfig } = await import("../rate-limit-config");

		const result = await freshCheck("stripe-webhook:10.0.0.153", freshConfig, "10.0.0.153");

		expect(result.success).toBe(false);
		expect(result.error).toContain("Accès refusé");

		delete process.env.RATE_LIMIT_BLACKLIST;
	});
});
