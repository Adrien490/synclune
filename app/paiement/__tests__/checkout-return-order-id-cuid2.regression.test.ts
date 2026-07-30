import { describe, it, expect, vi, beforeEach } from "vitest";
import { VALID_CUID, VALID_CUID2_NON_C } from "@/test/factories";

/**
 * @regression checkout-return-order-id-cuid2-2026-07-30
 *
 * `/paiement/retour` validait `order_id` avec `z.cuid()` — la regex cuid **v1**
 * `/^[cC][0-9a-z]{6,}$/`, qui exige un `c` initial. Or `Order.id` est
 * `@default(cuid(2))` depuis le commit 38f326311 : un id cuid v2 commence par une
 * lettre tirée au hasard dans `a-z`. Le validateur n'avait pas suivi la migration du
 * générateur, si bien que `safeParse` échouait sur ~96 % des commandes réelles et la
 * page tombait sur son `redirect("/")` final.
 *
 * Comme `stripe.confirmPayment` redirige TOUJOURS (`redirect: "always"` par défaut),
 * chaque paiement carte — 3DS ou non — transite par cette page : le client qui venait
 * de payer atterrissait sur la page d'accueil, sans numéro de commande, sans bouton
 * reçu, et l'échec ne rejoignait pas davantage `/paiement/annulation`. `PurchaseTracker`
 * n'était jamais monté (événement d'achat analytics perdu). La commande, elle, était
 * bien encaissée par le webhook — ce n'était pas un bug d'argent.
 *
 * Ce que ce test ajoute par-dessus `checkout-return-decision.test.ts` : cette suite-là
 * n'utilisait que `VALID_CUID`, qui commence par `c`, et passait donc au vert sur les
 * 7 branches de la table de décision pendant que la production échouait sur toutes.
 * L'assertion critique est ici la PREMIÈRE : un id non-`c` doit atteindre sa
 * destination. Les fixtures en `c…` restent testées pour couvrir les ids historiques.
 */

const { mockRedirect, mockRetrieve } = vi.hoisted(() => ({
	mockRedirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT:${url}`);
	}),
	mockRetrieve: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	redirect: mockRedirect,
}));

vi.mock("@/shared/lib/stripe", () => ({
	stripe: {
		paymentIntents: { retrieve: mockRetrieve },
	},
}));

import CheckoutReturnPage from "../retour/page";

const PI_ID = "pi_test_cuid2";

function run(params: Record<string, string>) {
	return CheckoutReturnPage({ searchParams: Promise.resolve(params) });
}

async function lastRedirectFor(params: Record<string, string>): Promise<string> {
	await expect(run(params)).rejects.toThrow(/NEXT_REDIRECT/);
	return mockRedirect.mock.calls.at(-1)![0] as string;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("CheckoutReturnPage — order_id cuid2 (première lettre ≠ 'c')", () => {
	it("un paiement réussi avec un order_id cuid2 non-'c' atteint /paiement/confirmation (et PAS l'accueil)", async () => {
		mockRetrieve.mockResolvedValue({ status: "succeeded", metadata: { orderNumber: "SYN-42" } });

		const url = await lastRedirectFor({
			payment_intent: PI_ID,
			redirect_status: "succeeded",
			order_id: VALID_CUID2_NON_C,
		});

		// L'assertion qui prouve la régression : avant le fix, `url` valait "/".
		expect(url).not.toBe("/");
		expect(url).toContain("/paiement/confirmation");
		expect(url).toContain(`order_id=${VALID_CUID2_NON_C}`);
		expect(url).toContain("order_number=SYN-42");
	});

	it("le PaymentIntent est bien interrogé pour un order_id cuid2 non-'c' (la garde de forme ne court-circuite plus)", async () => {
		mockRetrieve.mockResolvedValue({ status: "succeeded", metadata: { orderNumber: "SYN-42" } });

		await expect(
			run({
				payment_intent: PI_ID,
				redirect_status: "succeeded",
				order_id: VALID_CUID2_NON_C,
			}),
		).rejects.toThrow(/NEXT_REDIRECT/);

		// Avant le fix : 0 appel — on redirigeait sur "/" sans jamais vérifier le statut.
		expect(mockRetrieve).toHaveBeenCalledWith(PI_ID);
	});

	it("un échec avec un order_id cuid2 non-'c' atteint /paiement/annulation", async () => {
		mockRetrieve.mockResolvedValue({ status: "canceled", metadata: { orderNumber: "SYN-42" } });

		const url = await lastRedirectFor({
			payment_intent: PI_ID,
			redirect_status: "failed",
			order_id: VALID_CUID2_NON_C,
		});

		expect(url).toContain("/paiement/annulation");
		expect(url).toContain("reason=payment_failed");
	});

	it("les ids cuid v1 historiques (préfixe 'c') restent acceptés", async () => {
		mockRetrieve.mockResolvedValue({ status: "succeeded", metadata: { orderNumber: "SYN-1" } });

		const url = await lastRedirectFor({
			payment_intent: PI_ID,
			redirect_status: "succeeded",
			order_id: VALID_CUID,
		});

		expect(url).toContain("/paiement/confirmation");
		expect(url).toContain(`order_id=${VALID_CUID}`);
	});

	it("un order_id qui n'est pas un id (tirets, majuscules, vide) est toujours refusé → accueil, aucun appel Stripe", async () => {
		for (const orderId of ["order-with-dashes", "UPPERCASE123456789012345", ""]) {
			vi.clearAllMocks();

			await expect(
				run({ payment_intent: PI_ID, redirect_status: "succeeded", order_id: orderId }),
			).rejects.toThrow(/NEXT_REDIRECT/);

			expect(mockRedirect).toHaveBeenLastCalledWith("/");
			expect(mockRetrieve).not.toHaveBeenCalled();
		}
	});
});
