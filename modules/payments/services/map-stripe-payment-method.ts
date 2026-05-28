import type Stripe from "stripe";
import { PaymentMethod } from "@/app/generated/prisma/enums";
import { stripe } from "@/shared/lib/stripe";
import { logger } from "@/shared/lib/logger";

/**
 * Map du type Stripe `payment_method_details.type` (string libre côté Stripe)
 * vers l'enum Prisma `PaymentMethod`. Toute valeur non listée tombe sur OTHER
 * pour ne JAMAIS rejeter une transaction valide — un nouveau type Stripe
 * exotique sera tracé en `WALLET`/`OTHER` jusqu'à mise à jour de l'enum.
 *
 * Pourquoi cette granularité ? L'arrêté français 2022-1299 §4.3 impose la
 * transmission du **mode de règlement** dans le bloc transaction e-reporting
 * DGFiP — typologie unique CARD = rejet ou qualification erronée. Cf.
 * EINV-EREPORT-001.
 *
 * Apple Pay / Google Pay : Stripe les expose comme `card` avec `wallet`
 * sous-objet — on les remonte au top-level WALLET pour distinguer du card brut.
 */
const STRIPE_TYPE_TO_PAYMENT_METHOD: Record<string, PaymentMethod> = {
	card: PaymentMethod.CARD,
	sepa_debit: PaymentMethod.SEPA_DEBIT,
	klarna: PaymentMethod.KLARNA,
	link: PaymentMethod.LINK,
	bancontact: PaymentMethod.BANCONTACT,
	// Wallets non-card pourraient apparaître en top-level (cas rare) :
	apple_pay: PaymentMethod.WALLET,
	google_pay: PaymentMethod.WALLET,
};

/**
 * Lit le type effectif depuis `Charge.payment_method_details`. Détecte aussi
 * les wallets Apple/Google qui apparaissent imbriqués sous `card.wallet.type`.
 */
export function mapPaymentMethodFromCharge(charge: Stripe.Charge | null): PaymentMethod {
	const details = charge?.payment_method_details;
	if (!details) return PaymentMethod.OTHER;

	const topType = details.type;
	// Wallet over card (Apple Pay / Google Pay) : `details.card.wallet.type` est
	// "apple_pay" | "google_pay" | "samsung_pay" | "link" — on remonte WALLET
	// pour distinguer du card brut (typage DGFiP différent).
	const walletType = details.card?.wallet?.type;
	if (topType === "card" && walletType) {
		if (walletType === "link") return PaymentMethod.LINK;
		return PaymentMethod.WALLET;
	}

	return STRIPE_TYPE_TO_PAYMENT_METHOD[topType] ?? PaymentMethod.OTHER;
}

/**
 * Extrait le `PaymentMethod` à partir d'un `PaymentIntent` webhook. Stripe
 * n'expand pas `latest_charge` par défaut → on retrieve quand nécessaire.
 *
 * Best-effort : en cas d'échec API Stripe, fallback `null` (le caller garde
 * la valeur Order.paymentMethod existante = default `CARD`). Ne throw jamais
 * — un paiement valide ne doit pas être bloqué par une mauvaise mesure.
 */
export async function extractPaymentMethodFromPaymentIntent(
	paymentIntent: Stripe.PaymentIntent,
): Promise<PaymentMethod | null> {
	try {
		// Cas 1 : latest_charge est déjà expandé (rare en webhook standard).
		if (paymentIntent.latest_charge && typeof paymentIntent.latest_charge === "object") {
			return mapPaymentMethodFromCharge(paymentIntent.latest_charge);
		}

		// Cas 2 : retrieve la Charge depuis l'API.
		if (typeof paymentIntent.latest_charge === "string") {
			const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
			return mapPaymentMethodFromCharge(charge);
		}

		// Cas 3 : pas de charge associée (rare — PI succeeded sans capture).
		logger.warn(
			`extractPaymentMethodFromPaymentIntent — PI ${paymentIntent.id} has no latest_charge`,
			{ service: "payments", paymentIntentId: paymentIntent.id },
		);
		return null;
	} catch (e) {
		logger.error("extractPaymentMethodFromPaymentIntent failed (Stripe API)", e, {
			service: "payments",
			paymentIntentId: paymentIntent.id,
		});
		return null;
	}
}
