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
import { STRIPE_MIN_AMOUNT_EUR_CENTS } from "@/shared/constants/currency";

describe("Invariant Stripe min amount — tarifs de livraison", () => {
	it.each(Object.entries(SHIPPING_RATES))(
		"le tarif %s couvre le montant minimum Stripe (%s)",
		(_zone, rate) => {
			expect(rate.amount).toBeGreaterThanOrEqual(STRIPE_MIN_AMOUNT_EUR_CENTS);
		},
	);
});
