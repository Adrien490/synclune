import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPaymentRateLimitId } from "../payment-rate-limit-id";

/**
 * @regression payment-rate-limit-namespace-2026-07-30
 *
 * `checkRateLimit` indexe son compteur sur le SEUL identifiant
 * (`ratelimit:${identifier}`) — ni le nom de l'action, ni sa config n'entrent dans la
 * clé. `initializePayment` et `confirmCheckout` passaient `user:${userId}` nu, comme
 * toutes les actions panier, toutes les actions favoris et `validateDiscountCode` :
 * un seul compteur pour tout ce monde.
 *
 * Et comme la FENÊTRE appartient à l'entrée (pas à l'appelant), une visite sur
 * `/paiement` plantait une fenêtre d'1 h (CREATE_SESSION = 15/h) que 15 opérations
 * quelconques épuisaient — après quoi le bouton « Commander et payer » répondait
 * « Trop de tentatives » pour le reste de l'heure, sur une commande au montant déjà
 * verrouillé. Second effet : `validateDiscountCode` partageant la clé, un 429 faisait
 * disparaître la remise du récapitulatif sans un mot.
 *
 * Deux garde-fous ici :
 *  1. le contrat du helper (préfixe présent sur les 3 branches de résolution) ;
 *  2. une assertion de SOURCE sur les 4 actions — c'est elle qui attrape la
 *     réintroduction d'un identifiant nu, le helper pouvant toujours être contourné.
 */

const REPO_ROOT = process.cwd();

const PAYMENT_ACTIONS = [
	{ file: "initialize-payment.ts", action: "checkout-init" },
	{ file: "confirm-checkout.ts", action: "checkout-confirm" },
	{ file: "update-payment-amount.ts", action: "update-amount" },
	{ file: "cancel-orphan-payment-intent.ts", action: "cancel-orphan" },
] as const;

function readAction(file: string): string {
	const source = readFileSync(join(REPO_ROOT, "modules/payments/actions", file), "utf-8");
	// Commentaires retirés : ils citent abondamment les identifiants nus d'origine.
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("buildPaymentRateLimitId — contrat", () => {
	const IP = "192.168.1.1";

	it("préfixe la branche authentifiée", () => {
		expect(
			buildPaymentRateLimitId("checkout-confirm", { userId: "cm3user0001", ipAddress: IP }),
		).toBe("checkout-confirm:user:cm3user0001");
	});

	it("préfixe la branche invité et normalise la casse de l'email", () => {
		// Sans normalisation, `Foo@Bar.com` et `foo@bar.com` ouvraient deux budgets
		// distincts pour le même client — `initializePayment` passait l'email brut là où
		// `confirmCheckout` le minusculait.
		expect(
			buildPaymentRateLimitId("checkout-init", {
				userId: null,
				email: "  Foo@Bar.COM ",
				ipAddress: IP,
			}),
		).toBe(`checkout-init:guest:foo@bar.com:${IP}`);
	});

	it("préfixe aussi le repli session/IP (la branche qui restait nue)", () => {
		expect(
			buildPaymentRateLimitId("cancel-orphan", {
				userId: null,
				sessionId: "sess-1",
				ipAddress: IP,
			}),
		).toBe("cancel-orphan:session:sess-1");

		expect(buildPaymentRateLimitId("update-amount", { userId: null, ipAddress: IP })).toBe(
			`update-amount:ip:${IP}`,
		);
	});

	it("ne collisionne jamais entre deux actions pour un même appelant", () => {
		const caller = { userId: "cm3user0001", ipAddress: IP };
		const ids = PAYMENT_ACTIONS.map(({ action }) => buildPaymentRateLimitId(action, caller));
		expect(new Set(ids).size).toBe(PAYMENT_ACTIONS.length);
	});
});

describe("Actions de paiement — aucun identifiant de rate limit nu", () => {
	it.each(PAYMENT_ACTIONS)(
		"$file passe par buildPaymentRateLimitId('$action')",
		({ file, action }) => {
			const source = readAction(file);
			expect(source).toMatch(new RegExp(`buildPaymentRateLimitId\\(\\s*["']${action}["']`, "m"));
		},
	);

	it.each(PAYMENT_ACTIONS)("$file ne construit plus d'identifiant nu en littéral", ({ file }) => {
		const source = readAction(file);
		// Ce qui existait avant : `user:${userId}` / `guest:${email}:${ip}` en template.
		expect(source).not.toMatch(/[`"']\s*(user|guest):\$\{/);
		// Et plus aucun appel direct au constructeur générique, qui ne préfixe rien.
		expect(source).not.toMatch(/\bgetRateLimitIdentifier\s*\(/);
	});
});
