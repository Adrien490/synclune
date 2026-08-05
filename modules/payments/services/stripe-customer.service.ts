import Stripe from "stripe";
import { stripe } from "@/shared/lib/stripe";
import { buildIdempotencyKey } from "@/shared/lib/stripe-idempotency";
import { normalizeEmail } from "@/shared/utils/normalize-email";
import { logger } from "@/shared/lib/logger";
import * as Sentry from "@sentry/nextjs";

interface CreateStripeCustomerParams {
	email: string;
	firstName: string;
	lastName: string;
	address: {
		addressLine1: string;
		addressLine2?: string | null;
		postalCode: string;
		city: string;
		country?: string | null;
	};
	phoneNumber?: string | null;
}

type CreateStripeCustomerResult = { customerId: string } | { customerId: null; error?: string };

/**
 * Creates or retrieves a Stripe customer for checkout.
 *
 * **Deux mécanismes de dédupe, et il faut les deux** — le checkout étant 100 %
 * invité, aucune colonne locale ne porte le `cus_*` (`User.stripeCustomerId`
 * droppée au Lot 0 S1.1, `Order.stripeCustomerId` au right-sizing du 2026-08-04,
 * toutes deux faute de lecteur) :
 *
 *  1. **`customers.list({ email })` en amont** — couvre le cas long. C'est le
 *     seul chemin fortement cohérent : `customers.search` s'en exclut
 *     explicitement (« Don't use search in read-after-write flows where strict
 *     consistency is necessary… data is searchable in less than a minute…
 *     up to an hour behind during outages »), or un ré-init de checkout arrive
 *     précisément dans la minute.
 *  2. **La clé d'idempotence** — couvre la rafale : deux requêtes concurrentes
 *     passent toutes deux le `list` à vide, et c'est la clé qui empêche alors
 *     les deux `create` d'aboutir. ⚠️ Elle **expire au bout de 24 h** côté
 *     Stripe : à elle seule elle ne dédupe qu'une journée, ce qui laissait une
 *     cliente qui recommande la semaine suivante repartir sur un second `cus_*`.
 *
 * Best-effort de bout en bout : un échec de lecture ne bloque jamais le
 * checkout, il retombe sur la création (au pire un doublon, jamais un paiement
 * perdu).
 */
export async function getOrCreateStripeCustomer(
	params: CreateStripeCustomerParams,
): Promise<CreateStripeCustomerResult> {
	return Sentry.startSpan({ name: "stripe.customers.create", op: "stripe.customer" }, async () => {
		// ⚠️ La MÊME valeur normalisée doit servir aux trois usages : la recherche,
		// le corps du `create` et la clé d'idempotence. Le filtre `email` de
		// `customers.list` est **case-sensitive** (`api/customers/list`) — envoyer
		// l'email brut au `create` stockerait « Jane@X.com » chez Stripe, que la
		// recherche « jane@x.com » du checkout suivant ne retrouverait jamais. La
		// dédupe ne tient donc que si la valeur STOCKÉE est déjà canonique.
		const email = normalizeEmail(params.email);

		try {
			const existingId = await findStripeCustomerByEmail(email);
			if (existingId) return { customerId: existingId };

			// L'email est HASHÉ, pas concaténé : `api/idempotent_requests` déconseille
			// explicitement d'y mettre un identifiant personnel, et cette clé partait dans
			// un en-tête HTTP que Stripe conserve 24 h. Le digest préserve la
			// déduplication à l'identique (même email normalisé ⇒ même clé) et borne la
			// longueur, un email pouvant aller jusqu'à 255 c. à lui seul.
			//
			// Préfixe `-v2` : le corps du `create` a changé (email normalisé au lieu de
			// brut). Réutiliser l'ancien préfixe ferait rejeter par Stripe, pendant les
			// 24 h suivant le déploiement, tout replay d'une clé émise avec l'ancienne
			// casse — « Keys for idempotent requests can only be used with the same
			// parameters ». Même parade que le suffixe `-r2` d'`initialize-payment`.
			const customerIdempotencyKey = buildIdempotencyKey("customer-create-v2", [email]);

			// `initializePayment` appelle ce service AVANT toute saisie d'adresse : il
			// passe des chaînes vides. On omet alors `name` et `address` au lieu
			// d'envoyer un objet de chaînes vides — sinon tout client qui abandonne le
			// tunnel laisse chez Stripe une fiche à l'adresse `{ country: "FR" }` seule,
			// que rien ne distingue d'une adresse réellement renseignée. L'identité de
			// facturation arrive à `confirmCheckout` via `enrichStripeCustomer`.
			const fullName = `${params.firstName} ${params.lastName}`.trim();
			const hasAddress = Boolean(
				params.address.addressLine1 || params.address.postalCode || params.address.city,
			);

			const customer = await stripe.customers.create(
				{
					email,
					...(fullName && { name: fullName }),
					...(hasAddress && {
						address: {
							line1: params.address.addressLine1,
							line2: params.address.addressLine2 ?? undefined,
							postal_code: params.address.postalCode,
							city: params.address.city,
							country: params.address.country ?? "FR",
						},
					}),
					...(params.phoneNumber && { phone: params.phoneNumber }),
					metadata: {
						source: "checkout_b2c",
						createdFrom: "synclune-bijoux",
					},
				},
				{ idempotencyKey: customerIdempotencyKey },
			);

			return { customerId: customer.id };
		} catch (e) {
			if (e instanceof Stripe.errors.StripeInvalidRequestError) {
				return { customerId: null, error: "Impossible de créer le profil client de paiement." };
			}
			// Transient error: continue without a Stripe customer
			logger.warn(
				"[STRIPE_CUSTOMER] Transient error creating Stripe customer, continuing without",
				{
					email,
					error: e instanceof Error ? e.message : String(e),
				},
			);
			return { customerId: null };
		}
	});
}

/**
 * Retrouve un client Stripe existant par son email exact.
 *
 * `customers.list` et non `customers.search` : la doc de Search exclut
 * elle-même les flux read-after-write (index à la minute, jusqu'à une heure de
 * retard en incident), ce qui est exactement le rythme d'un checkout.
 *
 * `limit: 1` suffit : la liste est triée par date de création décroissante, donc
 * on récupère la fiche la plus récente — celle que `enrichStripeCustomer` a
 * enrichie en dernier. Un compte peut porter plusieurs `cus_*` pour un même
 * email (doublons créés avant cette dédupe) ; on n'essaie pas de les fusionner,
 * c'est une opération Dashboard.
 *
 * Best-effort : toute erreur rend `null`, le caller crée alors normalement.
 */
async function findStripeCustomerByEmail(email: string): Promise<string | null> {
	try {
		const { data } = await stripe.customers.list({ email, limit: 1 });
		return data[0]?.id ?? null;
	} catch (e) {
		logger.warn("[STRIPE_CUSTOMER] Lookup by email failed, falling back to create", {
			email,
			error: e instanceof Error ? e.message : String(e),
		});
		return null;
	}
}

interface EnrichStripeCustomerParams {
	name: string;
	address: {
		addressLine1: string;
		addressLine2?: string | null;
		postalCode: string;
		city: string;
		country?: string | null;
	};
	phoneNumber?: string | null;
}

/**
 * Enriches an existing Stripe customer with the real billing identity
 * (name / address / phone) collected at checkout confirmation.
 *
 * The customer is created email-only at `initializePayment` (we don't yet have
 * the shipping address there), then enriched here via `customers.update` —
 * NOT a second `customers.create`, which would clash with the email-based
 * idempotency key from init and fail for guests.
 *
 * Best-effort by design: the Stripe customer object is cosmetic (the legal
 * invoice identity lives on the immutable Order snapshot, Art. 289 CGI), so an
 * enrichment failure must never break checkout. Errors are logged, swallowed.
 */
export async function enrichStripeCustomer(
	customerId: string,
	params: EnrichStripeCustomerParams,
): Promise<void> {
	try {
		await stripe.customers.update(customerId, {
			...(params.name && { name: params.name }),
			address: {
				line1: params.address.addressLine1,
				line2: params.address.addressLine2 ?? undefined,
				postal_code: params.address.postalCode,
				city: params.address.city,
				country: params.address.country ?? "FR",
			},
			...(params.phoneNumber && { phone: params.phoneNumber }),
		});
	} catch (e) {
		logger.warn("[STRIPE_CUSTOMER] Failed to enrich Stripe customer", {
			customerId,
			error: e instanceof Error ? e.message : String(e),
		});
	}
}
