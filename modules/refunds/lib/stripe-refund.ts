import * as Sentry from "@sentry/nextjs";
import { stripe } from "@/shared/lib/stripe";
import { stripeCircuitBreaker } from "@/shared/lib/circuit-breaker";
import { classifyStripeError } from "@/shared/lib/stripe-errors";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";
import { logger } from "@/shared/lib/logger";
import Stripe from "stripe";
import type {
	CreateStripeRefundParams,
	StripeRefundStatus,
	StripeRefundResult,
} from "../types/stripe-refund.types";

// Map internal RefundReason to Stripe's reason parameter.
// Stripe only accepts: "duplicate", "fraudulent", "requested_by_customer".
// Only FRAUD maps to "fraudulent" (unlocks Stripe's automated dispute handling).
// All other reasons (DEFECTIVE, WRONG_ITEM, LOST_IN_TRANSIT, OTHER) are legitimate
// merchant-side issues that map to "requested_by_customer" — the closest Stripe
// equivalent for non-fraud voluntary refunds.
const STRIPE_REASON_MAP: Record<string, Stripe.RefundCreateParams.Reason> = {
	FRAUD: "fraudulent",
	CUSTOMER_REQUEST: "requested_by_customer",
	DEFECTIVE: "requested_by_customer",
	WRONG_ITEM: "requested_by_customer",
	LOST_IN_TRANSIT: "requested_by_customer",
	OTHER: "requested_by_customer",
};

/**
 * Crée un remboursement via l'API Stripe
 *
 * @param params Paramètres du remboursement
 * @returns Résultat avec l'ID du remboursement Stripe ou erreur
 */
export async function createStripeRefund(
	params: CreateStripeRefundParams,
): Promise<StripeRefundResult> {
	try {
		// Valider qu'on a soit un paymentIntentId soit un chargeId
		if (!params.paymentIntentId && !params.chargeId) {
			return {
				success: false,
				error: "Un PaymentIntent ID ou Charge ID est requis pour le remboursement",
			};
		}

		// Validate PaymentIntent currency before creating the refund.
		// Guards against accidental cross-currency refunds if the PI was created
		// in a different currency (e.g. during Stripe account misconfiguration).
		// ORD-REFUND-008: skip retrieve PI si expectedCurrency fourni (-1 RT Stripe).
		if (params.expectedCurrency) {
			if (params.expectedCurrency.toUpperCase() !== DEFAULT_CURRENCY.toUpperCase()) {
				return {
					success: false,
					error: `Devise incompatible : la commande est en ${params.expectedCurrency.toUpperCase()}, attendu ${DEFAULT_CURRENCY}`,
				};
			}
		} else if (params.paymentIntentId) {
			const pi = await stripeCircuitBreaker.execute(() =>
				stripe.paymentIntents.retrieve(params.paymentIntentId!),
			);
			if (pi.currency !== DEFAULT_CURRENCY.toLowerCase()) {
				return {
					success: false,
					error: `Devise incompatible : le PaymentIntent est en ${pi.currency.toUpperCase()}, attendu ${DEFAULT_CURRENCY}`,
				};
			}
		}

		// IDEM-REFUND-001 : sur un retry, adopter un refund Stripe déjà créé par
		// une tentative antérieure dont la réponse a été perdue (marqué FAILED en
		// DB sans anchor stripeRefundId). Sans cette adoption, la rotation de la
		// clé d'idempotence (P0.2, voulue pour purger le cache d'erreur 24h de
		// Stripe) autoriserait un 2ᵉ refund réel sur un remboursement partiel.
		// Seuls les statuts vivants (succeeded/pending) sont adoptés — un refund
		// failed/canceled est le cas légitime du retry et laisse place au create.
		if (params.recoverExistingByMetadata && params.metadata?.refund_id) {
			let adopted: Stripe.Refund | undefined;
			try {
				const existingRefunds = await stripeCircuitBreaker.execute(() =>
					stripe.refunds.list({
						...(params.chargeId ? { charge: params.chargeId } : {}),
						...(params.paymentIntentId ? { payment_intent: params.paymentIntentId } : {}),
						limit: 100,
					}),
				);
				adopted = existingRefunds.data.find(
					(r) =>
						r.metadata?.refund_id === params.metadata?.refund_id &&
						(r.status === "succeeded" || r.status === "pending"),
				);
			} catch (listError) {
				// Fail-closed : impossible de garantir l'absence de refund existant →
				// on ne crée RIEN (créer ici est exactement le double-débit qu'on ferme).
				logger.error(
					"IDEM-REFUND-001: Stripe refunds.list failed on retry — aborting without create",
					listError,
					{ service: "stripe-refund" },
				);
				return {
					success: false,
					error:
						"Vérification des remboursements Stripe existants impossible — aucun remboursement créé, réessayez.",
				};
			}
			if (adopted) {
				logger.warn(
					`IDEM-REFUND-001: adopted existing Stripe refund ${adopted.id} (status: ${adopted.status}) instead of creating a duplicate on retry`,
					{ service: "stripe-refund" },
				);
				return {
					success: adopted.status === "succeeded",
					pending: adopted.status === "pending",
					refundId: adopted.id,
					status: (adopted.status ?? undefined) as StripeRefundStatus | undefined,
				};
			}
		}

		// Construire les paramètres du remboursement
		const refundParams: Stripe.RefundCreateParams = {
			amount: params.amount,
			reason:
				(params.reason ? STRIPE_REASON_MAP[params.reason] : undefined) ?? "requested_by_customer",
			metadata: params.metadata,
		};

		// Prioriser le PaymentIntent si disponible
		if (params.paymentIntentId) {
			refundParams.payment_intent = params.paymentIntentId;
		} else if (params.chargeId) {
			refundParams.charge = params.chargeId;
		}

		// Créer le remboursement Stripe avec clé d'idempotence
		const requestOptions: Stripe.RequestOptions = {};
		if (params.idempotencyKey) {
			requestOptions.idempotencyKey = params.idempotencyKey;
		}

		const refund = await stripeCircuitBreaker.execute(() =>
			stripe.refunds.create(refundParams, requestOptions),
		);

		// P0.1: Distinguer pending de succeeded
		// - succeeded = remboursement confirmé immédiatement
		// - pending = en attente de confirmation (ex: virement bancaire)
		return {
			success: refund.status === "succeeded",
			pending: refund.status === "pending",
			refundId: refund.id,
			status: (refund.status ?? undefined) as StripeRefundStatus | undefined,
		};
	} catch (error) {
		logger.error("Stripe refund creation failed", error, { service: "stripe-refund" });

		// Gérer les erreurs Stripe spécifiques
		if (error instanceof Stripe.errors.StripeError) {
			// P0.3: Idempotence - si déjà remboursé, c'est un succès
			// Peut arriver si retry webhook ou hash collision idempotency key
			if (error.code === "charge_already_refunded") {
				logger.warn("Charge already refunded, treating as success (idempotence)", {
					service: "stripe-refund",
				});

				// Recover the existing refund ID from Stripe
				// Fetch multiple refunds and match by metadata or amount to avoid
				// returning an unrelated partial refund from the same charge

				// La charge EST remboursée (succès idempotent) mais si aucun candidat
				// fiable n'est identifiable, on finalise SANS anchor stripeRefundId :
				// traçabilité reconcile dégradée → alerte Sentry pour vérification
				// manuelle (un logger.warn seul ne déclenchait rien).
				const captureAnchorlessRecovery = (reason: string) => {
					Sentry.withScope((scope) => {
						scope.setLevel("warning");
						scope.setTag("refundAction", "charge-already-refunded-recovery");
						scope.setFingerprint(["refund-anchorless", params.metadata?.refund_id ?? "unknown"]);
						scope.setContext("refund", {
							refundId: params.metadata?.refund_id ?? null,
							amount: params.amount,
							reason,
						});
						Sentry.captureMessage(
							"Refund finalisé sans anchor stripeRefundId (charge_already_refunded) — vérification manuelle requise",
							"warning",
						);
					});
				};

				let existingRefundId: string | undefined;
				try {
					const existingRefunds = await stripe.refunds.list({
						...(params.chargeId ? { charge: params.chargeId } : {}),
						...(params.paymentIntentId ? { payment_intent: params.paymentIntentId } : {}),
						limit: 10,
					});

					// Match priority: metadata refund_id > amount + recent timestamp > first refund
					const byMetadata = params.metadata?.refund_id
						? existingRefunds.data.find((r) => r.metadata?.refund_id === params.metadata!.refund_id)
						: undefined;

					// Match by amount AND creation time proximity (within 1 hour) for safety
					const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
					const byAmountAndTime = existingRefunds.data.find(
						(r) => r.amount === params.amount && r.created >= oneHourAgo,
					);
					const byAmount = existingRefunds.data.find((r) => r.amount === params.amount);

					// Fail hard if no metadata match and multiple candidates by amount exist
					const amountCandidates = existingRefunds.data.filter((r) => r.amount === params.amount);
					if (!byMetadata && amountCandidates.length > 1) {
						logger.warn(
							`Multiple refunds match amount ${params.amount}, cannot safely determine which one. Manual verification required.`,
							{ service: "stripe-refund" },
						);
						captureAnchorlessRecovery("multiple-amount-candidates");
						// Still return success (charge IS refunded) but without a specific refundId
						return {
							success: true,
							pending: false,
							refundId: undefined,
						};
					}

					// Pas de fallback « premier refund de la liste » : sans match par
					// metadata ni par montant, le candidat serait d'un montant DIFFÉRENT
					// (ex: full refund Dashboard) — l'adopter lierait notre Refund à un
					// refund Stripe étranger (et P2002 sur stripeRefundId @unique si
					// déjà lié). Mieux vaut finaliser sans anchor + alerte.
					const matched = byMetadata ?? byAmountAndTime ?? byAmount;
					existingRefundId = matched?.id;

					// Warn when using weak fallback matching (no metadata)
					if (!byMetadata && existingRefundId) {
						const matchType = byAmountAndTime ? "amount+time" : "amount-only";
						logger.warn(
							`Recovered refund via fallback (${matchType}): ${existingRefundId}. No metadata match available.`,
							{ service: "stripe-refund" },
						);
					}
					if (!existingRefundId) {
						captureAnchorlessRecovery("no-candidate-match");
					}
				} catch {
					logger.warn("Could not recover existing refund ID", { service: "stripe-refund" });
					captureAnchorlessRecovery("refunds-list-failed");
				}

				return {
					success: true,
					pending: false,
					refundId: existingRefundId,
				};
			}

			// Classifier pour que le caller distingue une erreur transiente
			// (réseau, rate limit — retry admin pertinent) d'un échec définitif.
			const classification = classifyStripeError(error);
			return {
				success: false,
				error: error.message,
				errorKind: classification.kind,
				retryable: classification.retryable,
			};
		}

		return {
			success: false,
			error: "Erreur lors de la création du remboursement Stripe",
			errorKind: "unknown",
			retryable: false,
		};
	}
}

/**
 * Récupère le statut d'un remboursement Stripe
 *
 * @param refundId ID du remboursement Stripe (re_xxx)
 * @returns Statut du remboursement
 */
export async function getStripeRefundStatus(refundId: string): Promise<StripeRefundStatus | null> {
	try {
		const refund = await stripe.refunds.retrieve(refundId);
		return refund.status as StripeRefundStatus | null;
	} catch (error) {
		logger.error("Failed to retrieve Stripe refund status", error, { service: "stripe-refund" });
		return null;
	}
}
