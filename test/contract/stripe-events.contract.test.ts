/**
 * @regression stripe-events-checkout
 *
 * Contract test des events Stripe consommés par le webhook (migration lean,
 * lot 3) : `checkout.session.completed` et `checkout.session.expired` — les
 * DEUX seuls events du checkout hébergé (D4).
 *
 * Trois volets, sans réseau ni signature :
 * 1. chaque fixture `test/fixtures/stripe/*.json` a la shape d'enveloppe
 *    attendue ET porte les champs que nos handlers consomment réellement
 *    (`customer_details.email`, `collected_information.shipping_details.address`,
 *    `payment_intent`, `payment_status`) — si Stripe renomme un chemin, c'est
 *    ICI que ça rougit, pas en production ;
 * 2. la route webhook a un `case` pour chaque fixture (pas d'event fixé sans
 *    handler) ;
 * 3. chaque `case` de la route a sa fixture (pas de handler sans fixture).
 *
 * Regénérer une fixture : `stripe trigger <type> --print-json` (CLI Stripe),
 * ou copier le payload de la doc locale `docs/stripe/07-checkout-sessions.md`.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FIXTURES_DIR = join(process.cwd(), "test", "fixtures", "stripe");
const WEBHOOK_ROUTE = join(process.cwd(), "app", "api", "webhooks", "stripe", "route.ts");

interface StripeEventFixture {
	id: string;
	object: string;
	type: string;
	api_version: string;
	data: { object: Record<string, unknown> };
}

function loadFixtures(): Array<{ file: string; event: StripeEventFixture }> {
	return readdirSync(FIXTURES_DIR)
		.filter((file) => file.endsWith(".json"))
		.map((file) => ({
			file,
			event: JSON.parse(readFileSync(join(FIXTURES_DIR, file), "utf8")) as StripeEventFixture,
		}));
}

describe("fixtures stripe — shape d'enveloppe", () => {
	const fixtures = loadFixtures();

	it("il existe au moins les deux events du checkout hébergé", () => {
		const types = fixtures.map(({ event }) => event.type);
		expect(types).toContain("checkout.session.completed");
		expect(types).toContain("checkout.session.expired");
	});

	it.each(loadFixtures())("$file : enveloppe event + objet checkout.session", ({ file, event }) => {
		expect(event.object).toBe("event");
		expect(event.id).toMatch(/^evt_/);
		// Le nom du fichier EST le type — la convention qui rend l'inventaire lisible.
		expect(file).toBe(`${event.type}.json`);
		expect(event.data.object.object).toBe("checkout.session");
		expect(event.data.object.id).toMatch(/^cs_/);
	});
});

describe("checkout.session.completed — champs consommés par markOrderPaidFromSession", () => {
	const { event } = loadFixtures().find(
		({ event }) => event.type === "checkout.session.completed",
	)!;
	const session = event.data.object as {
		payment_status: string;
		payment_intent: string;
		customer_details: { email: string; name: string };
		collected_information: {
			shipping_details: {
				name: string;
				address: { line1: string; postal_code: string; city: string; country: string };
			};
		};
	};

	it("est payé et ancré sur un PaymentIntent", () => {
		expect(session.payment_status).toBe("paid");
		expect(session.payment_intent).toMatch(/^pi_/);
	});

	it("porte l'email et le nom (customer_details)", () => {
		expect(session.customer_details.email).toBeTruthy();
		expect(session.customer_details.name).toBeTruthy();
	});

	it("porte l'adresse de livraison (collected_information.shipping_details)", () => {
		const { address, name } = session.collected_information.shipping_details;
		expect(name).toBeTruthy();
		expect(address.line1).toBeTruthy();
		expect(address.postal_code).toBeTruthy();
		expect(address.city).toBeTruthy();
		expect(address.country).toMatch(/^[A-Z]{2}$/);
	});
});

describe("checkout.session.expired — champs consommés par cancelOrderFromExpiredSession", () => {
	const { event } = loadFixtures().find(({ event }) => event.type === "checkout.session.expired")!;

	it("est expiré et non payé (le handler ne lit que l'id)", () => {
		const session = event.data.object as { status: string; payment_status: string };
		expect(session.status).toBe("expired");
		expect(session.payment_status).not.toBe("paid");
	});
});

describe("parité fixtures ↔ route webhook", () => {
	const routeSource = readFileSync(WEBHOOK_ROUTE, "utf8");
	const casePattern = /case\s+"(checkout\.[a-z_.]+)"/g;
	const handledTypes = Array.from(routeSource.matchAll(casePattern), (match) => match[1]);
	const fixtureTypes = loadFixtures().map(({ event }) => event.type);

	it("chaque fixture a son case dans la route", () => {
		for (const type of fixtureTypes) {
			expect(handledTypes).toContain(type);
		}
	});

	it("chaque case de la route a sa fixture", () => {
		for (const type of handledTypes) {
			expect(fixtureTypes).toContain(type);
		}
	});
});
