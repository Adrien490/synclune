/**
 * Invariant MIN-AMOUNT-DIVERGE-01 (audit checkout Stripe Elements 2026-07-02).
 *
 * `order-creation.service.ts` ne plancher PAS le total autoritaire à
 * `STRIPE_MIN_AMOUNT_EUR_CENTS` (contrairement à `update-payment-amount.ts` qui
 * clampe le PI provisoire). L'invariant qui rend ce plancher inutile est :
 * tout tarif de livraison >= STRIPE_MIN_AMOUNT_EUR_CENTS, donc
 * `total = subtotalAfterDiscount + shippingCost >= shippingCost >= min Stripe`.
 *
 * Introduire la gratuité de port (ou un tarif < 50 c) casserait silencieusement
 * le checkout : Stripe refuserait le `paymentIntents.update` à confirmCheckout
 * et `cleanupFailedCheckout` annulerait la commande. Ce test transforme cette
 * régression silencieuse en échec explicite — si vous ajoutez un tarif < 50 c,
 * ajoutez d'abord un rejet métier explicite dans `createOrderInTransaction`
 * (PAS un clamp silencieux qui sur-facturerait le client).
 */
import { describe, expect, it } from "vitest";
import { SHIPPING_RATES } from "@/modules/orders/constants/shipping-rates";
import { parseEstimatedDays } from "@/modules/orders/services/shipping.service";
import { STRIPE_MIN_AMOUNT_EUR_CENTS } from "@/shared/constants/currency";

describe("Invariant Stripe min amount — tarifs de livraison", () => {
	it.each(Object.entries(SHIPPING_RATES))(
		"le tarif %s couvre le montant minimum Stripe (%s)",
		(_zone, rate) => {
			expect(rate.amount).toBeGreaterThanOrEqual(STRIPE_MIN_AMOUNT_EUR_CENTS);
		},
	);
});

describe("Invariant format des délais — barème SHIPPING_RATES", () => {
	// `parseEstimatedDays` retombe SILENCIEUSEMENT sur [3, 5] quand la chaîne ne
	// matche pas « X-Y » : une faute de frappe dans le barème fausserait
	// `estimateDeliveryDate` (donc l'email d'expédition et /suivi-commande) sans
	// aucun signal. Ce test transforme ce repli muet en échec explicite : le
	// tuple parsé doit être exactement celui écrit dans la chaîne.
	it.each(Object.entries(SHIPPING_RATES))(
		"le délai %s est parsable sans repli sur le fallback",
		(_zone, rate) => {
			const match = rate.estimatedDays.match(/^(\d+)-(\d+) jours ouvrés$/);
			expect(match, `format inattendu : "${rate.estimatedDays}"`).not.toBeNull();
			expect(parseEstimatedDays(rate.estimatedDays)).toEqual([
				Number(match![1]),
				Number(match![2]),
			]);
		},
	);
});
