"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
	type Prisma,
	HistorySource,
	StockMovementSource,
} from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { recordStockMovementTx } from "@/modules/skus/services/stock-movement.service";
import { selectDeactivatableSkuIds } from "@/modules/skus/services/validate-public-active-sku.service";
import { collectStockInvalidationTags } from "@/modules/products/utils/cache.utils";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { updateTag } from "next/cache";
import { logger } from "@/shared/lib/logger";

import * as Sentry from "@sentry/nextjs";
import { sendOrderConfirmationEmail } from "@/modules/emails/services/order-emails";
import { generateInvoiceAccessToken } from "../utils/invoice-token";
import { buildOrderTrackingUrl } from "../utils/build-order-tracking-url";
import { buildUrl } from "@/shared/constants/urls";
import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderInvalidationTags } from "../constants/cache";
import { markAsPaidSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";
import { acquireOrderPaidLockTx } from "../utils/order-paid-lock";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";

/**
 * Marque une commande comme payée manuellement
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être en statut PENDING
 * - Le paiement ne doit pas déjà être PAID
 * - Passe PaymentStatus à PAID
 * - Passe OrderStatus à PROCESSING
 * - Passe FulfillmentStatus à PROCESSING
 * - Enregistre la date de paiement
 */
export async function markAsPaid(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;

		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.MARK_AS_PAID);
		if ("error" in rateLimit) return rateLimit.error;

		const rawId = safeFormGet(formData, "id");
		const note = safeFormGet(formData, "note");
		const rawConfirm = safeFormGet(formData, "confirmOffStripePayment");

		const validated = validateInput(markAsPaidSchema, {
			id: rawId,
			note,
			// Checkbox HTML : "on" (natif/Radix) ou "true" (soumission programmatique).
			confirmOffStripePayment: rawConfirm === "on" || rawConfirm === "true",
		});
		if ("error" in validated) return validated.error;

		const { id, confirmOffStripePayment } = validated.data;

		// EINV-CASH-002 (audit montant Stripe vs commande, 2026-07-02) : la garde
		// EINV-CASH-001 (plus bas) vérifie la PRÉSENCE du PaymentIntent, pas son
		// statut réel — un admin pouvait marquer payée une commande dont le PI est
		// resté requires_payment_method sans autre friction. On interroge Stripe :
		// si le PI n'est pas settled (succeeded/processing), l'admin doit attester
		// explicitement un encaissement hors Stripe (virement/chèque), consigné
		// dans l'audit trail. Fail-open si l'API Stripe est indisponible (garde
		// anti-erreur pour admin de confiance, pas anti-adversaire — un outage
		// Stripe ne doit pas bloquer une recovery légitime) : piStatus
		// "unavailable" est alors tracé dans OrderHistory.
		let piStatus = "unavailable";
		const preflight = await prisma.order.findUnique({
			where: { id, ...notDeleted },
			select: { stripePaymentIntentId: true },
		});
		if (preflight?.stripePaymentIntentId) {
			try {
				const { stripe } = await import("@/shared/lib/stripe");
				const pi = await stripe.paymentIntents.retrieve(preflight.stripePaymentIntentId);
				piStatus = pi.status;
			} catch (retrieveError) {
				logger.warn(
					`[mark-as-paid] PaymentIntent ${preflight.stripePaymentIntentId} retrieve failed — statut non vérifiable`,
					{ action: "mark-as-paid", orderId: id },
				);
				Sentry.withScope((scope) => {
					scope.setLevel("warning");
					scope.setTag("payments", "mark-as-paid-pi-status-unavailable");
					scope.setContext("order", {
						orderId: id,
						stripePaymentIntentId: preflight.stripePaymentIntentId,
					});
					Sentry.captureException(retrieveError);
				});
			}
		}
		const piSettled = piStatus === "succeeded" || piStatus === "processing";
		const piStatusKnownUnsettled = piStatus !== "unavailable" && !piSettled;
		if (piStatusKnownUnsettled && !confirmOffStripePayment) {
			return {
				status: ActionStatus.ERROR,
				message: `Le paiement Stripe de cette commande n'a pas abouti (statut : ${piStatus}). Cochez la confirmation « paiement reçu hors Stripe » pour attester un encaissement par virement ou chèque.`,
			};
		}

		// Transaction: fetch + validate + stock check + update + audit atomically (prevents TOCTOU race)
		const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
			// STOCK-02 : verrou advisory sérialisant la transition PAID avec le webhook
			// payment_intent.succeeded concurrent (même commande). Le 2ᵉ arrivant bloque
			// puis relit l'état PAID committé → sa garde d'idempotence court-circuite,
			// évitant un double décrément de stock. À prendre AVANT le findUnique.
			await acquireOrderPaidLockTx(tx, id);

			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					status: true,
					paymentStatus: true,
					fulfillmentStatus: true,
					userId: true,
					customerEmail: true,
					customerName: true,
					subtotal: true,
					discountAmount: true,
					shippingCost: true,
					total: true,
					shippingFirstName: true,
					shippingLastName: true,
					shippingAddress1: true,
					shippingAddress2: true,
					shippingPostalCode: true,
					shippingCity: true,
					shippingCountry: true,
					stripePaymentIntentId: true,
					items: {
						select: {
							skuId: true,
							quantity: true,
							productTitle: true,
							skuColor: true,
							skuColorHexes: true,
							skuMaterial: true,
							skuSize: true,
							price: true,
						},
					},
				},
			});

			if (!found) return null;

			if (found.paymentStatus === PaymentStatus.PAID) {
				return { ...found, _error: "already_paid" as const };
			}

			if (
				found.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED ||
				found.paymentStatus === PaymentStatus.REFUNDED
			) {
				return { ...found, _error: "already_refunded" as const };
			}

			if (found.status === OrderStatus.CANCELLED) {
				return { ...found, _error: "cancelled" as const };
			}

			// Miroir de getOrderPermissions().canMarkAsPaid : seul PENDING/PROCESSING
			// est encaissable manuellement. Cette action était la seule du module sans
			// précondition de statut — une commande SHIPPED/DELIVERED dont le paiement
			// retomberait FAILED/EXPIRED aurait été ramenée à PROCESSING avec
			// re-décrément de stock (audit 2026-08-01, P3 — seul trou du graphe).
			if (found.status !== OrderStatus.PENDING && found.status !== OrderStatus.PROCESSING) {
				return { ...found, _error: "not_markable" as const };
			}

			// EINV-CASH-001 : preuve Stripe obligatoire. Une commande marquée payée
			// DOIT être née d'un checkout Stripe (PaymentIntent — seul flow émis depuis
			// le retrait du Checkout Session hosted). Sans cette preuve PSP, mark-as-paid
			// fabriquerait un encaissement fictif → facture fiscale (Art. 286 / 289-I
			// CGI) sans contrepartie réelle, ce qui expose Synclune à une qualification
			// "logiciel de caisse" non conforme (invariant CLAUDE.md #8 — « pas de
			// commande payée sans PaymentIntent »).
			//
			// Depuis le 2026-07-31, la base refuse elle aussi cet état
			// (CHECK `Order_paid_requires_stripe_proof`) : cette garde applicative
			// reste le chemin qui produit un message d'erreur exploitable.
			if (!found.stripePaymentIntentId) {
				return { ...found, _error: "no_stripe_proof" as const };
			}

			// ORD-BIZ-004 : recovery FAILED/EXPIRED → PAID autorisée (paiement
			// bancaire manuel après échec). Safety guard : refuser s'il existe
			// déjà un Refund non-terminal (sinon on autorise mark-as-paid + le
			// Refund finalise plus tard = bug comptable).
			const isRecovery =
				found.paymentStatus === PaymentStatus.FAILED ||
				found.paymentStatus === PaymentStatus.EXPIRED;
			if (isRecovery) {
				const existingRefund = await tx.refund.findFirst({
					where: {
						orderId: id,
						status: { in: ["PENDING", "APPROVED", "COMPLETED"] },
						deletedAt: null,
					},
					select: { id: true },
				});
				if (existingRefund) {
					return { ...found, _error: "has_pending_refund" as const };
				}
			}

			// Stock decrement.
			// Flow Elements : le stock n'est JAMAIS décrémenté avant le passage à PAID
			// (order-creation vérifie FOR UPDATE mais ne décrémente pas ; le décrément
			// a lieu dans processOrderFromPaymentIntent au webhook `payment_intent.succeeded`).
			// Une commande PENDING/FAILED/EXPIRED — seuls états recoverables ici — a donc
			// toujours son stock à décrémenter au moment du mark-as-paid manuel.
			const stockAdjusted = found.items.length > 0;
			/** SKU décrémentés — sert l'invalidation de cache post-commit. */
			const stockChanged: Array<{ skuId: string; productId: string }> = [];
			/** SKU tombés à 0 — candidats à la désactivation automatique. */
			const zeroStockSkus: Array<{ skuId: string; productId: string }> = [];

			// Atomic stock decrement with conditional WHERE (prevents overselling).
			//
			// STOCK-LEDGER-001 : passé en `UPDATE … RETURNING` (même pattern que
			// `adjust-sku-stock.ts`) plutôt qu'un `updateMany`, pour récupérer
			// `inventory` et `productId` APRÈS l'écriture et en dériver le
			// `StockMovement` sans requête supplémentaire ni fenêtre de course. Une
			// lecture préalable séparée aurait pu être invalidée par un writer
			// concurrent entre le SELECT et l'UPDATE, et le journal aurait consigné des
			// valeurs absolues fausses.
			//
			// La condition reste identique : `isActive` ET `inventory >= quantity`.
			// Zéro ligne affectée ⇒ stock insuffisant ou variante inactive ⇒ throw, ce
			// qui annule toute la transaction (c'est la garde anti-survente de ce
			// chemin, le seul décrément manuel de la boutique).
			if (stockAdjusted) {
				for (const item of found.items) {
					const updated = await tx.$queryRaw<Array<{ inventory: number; productId: string }>>`
						UPDATE "ProductSku"
						SET "inventory" = "inventory" - ${item.quantity}, "updatedAt" = NOW()
						WHERE "id" = ${item.skuId}
						AND "isActive" = true
						AND "inventory" >= ${item.quantity}
						RETURNING "inventory", "productId"
					`;

					if (updated.length === 0) {
						throw new Error(`Stock insuffisant ou variante inactive pour ${item.productTitle}`);
					}

					const row = updated[0]!;
					stockChanged.push({ skuId: item.skuId, productId: row.productId });
					if (row.inventory === 0) {
						zeroStockSkus.push({ skuId: item.skuId, productId: row.productId });
					}
					await recordStockMovementTx(tx, {
						skuId: item.skuId,
						productId: row.productId,
						previousInventory: row.inventory + item.quantity,
						newInventory: row.inventory,
						source: StockMovementSource.ORDER,
						reason: `Encaissement manuel — commande ${found.orderNumber}`,
						createdById: adminUser.id,
						createdByName: adminUser.name ?? null,
					});
				}
			}

			// Désactivation des SKU tombés à 0 — parité avec le chemin webhook, qui le
			// faisait alors que cet encaissement manuel ne le faisait PAS : le même
			// événement métier (dernière unité vendue) laissait donc deux états
			// différents selon le canal.
			// STOCK-LAST-ACTIVE-SKU-001 : on passe par le même filtre que le webhook, donc
			// jamais le dernier SKU actif d'un produit PUBLIC (sinon PDP en 404).
			if (zeroStockSkus.length > 0) {
				const productIds = [...new Set(zeroStockSkus.map((s) => s.productId))];
				const [products, activeSiblings] = await Promise.all([
					tx.product.findMany({
						where: { id: { in: productIds } },
						select: { id: true, status: true },
					}),
					tx.productSku.findMany({
						where: { productId: { in: productIds }, isActive: true, deletedAt: null },
						select: { productId: true },
					}),
				]);
				const statusByProductId = new Map(products.map((p) => [p.id, p.status as string]));
				const activeTotalByProductId = new Map<string, number>();
				for (const sibling of activeSiblings) {
					activeTotalByProductId.set(
						sibling.productId,
						(activeTotalByProductId.get(sibling.productId) ?? 0) + 1,
					);
				}

				const deactivatableSkuIds = selectDeactivatableSkuIds(
					zeroStockSkus.map((s) => ({
						skuId: s.skuId,
						productId: s.productId,
						productStatus: statusByProductId.get(s.productId) ?? "DRAFT",
					})),
					activeTotalByProductId,
				);
				if (deactivatableSkuIds.length > 0) {
					await tx.productSku.updateMany({
						where: { id: { in: deactivatableSkuIds } },
						data: { isActive: false },
					});
				}
			}

			// Mettre à jour la commande.
			// EINV-CASH-005 : contrairement au chemin webhook, aucun
			// payment_intent.succeeded n'arrivera jamais ici (le PI est annulé
			// post-commit, ORD-BIZ-007) → pas de facture eager par ce canal. On pose
			// le flag DLQ DANS la tx pour que la commande soit visible de la
			// sélection candidats de reconcile-invoices (qui ne ramène QUE les
			// commandes flaguées) même si le process meurt juste après le commit.
			// Le rattrapage eager post-commit ci-dessous le baisse dans le cas
			// nominal.
			//
			// (Il y avait ici un SECOND flag `ereportingRetryDeferred` jusqu'au
			// retrait de l'e-reporting le 2026-07-26 — cf. CLAUDE.md, à réécrire au
			// go-live contre une Plateforme Agréée réelle.)
			// Garde atomique : ré-asserte l'état LU (pattern des 5 actions sœurs —
			// cette action était la seule à écrire sans clause de statut). THROW et
			// non `return _error` : le décrément de stock ci-dessus est déjà écrit
			// dans la tx, seul un rollback complet le défait.
			const claimed = await tx.order.updateMany({
				where: {
					id,
					...notDeleted,
					status: found.status,
					paymentStatus: found.paymentStatus,
				},
				data: {
					paymentStatus: PaymentStatus.PAID,
					status: OrderStatus.PROCESSING,
					fulfillmentStatus: FulfillmentStatus.PROCESSING,
					paidAt: new Date(),
					invoiceRetryDeferred: true,
				},
			});
			if (claimed.count === 0) {
				throw new Error("CONCURRENT_STATE_CHANGE");
			}

			// Audit trail (Best Practice Stripe 2025). ORD-BIZ-004 :
			// metadata.recoveredFrom flag recovery FAILED/EXPIRED → PAID.
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "PAID",
				previousStatus: found.status,
				newStatus: OrderStatus.PROCESSING,
				previousPaymentStatus: found.paymentStatus,
				newPaymentStatus: PaymentStatus.PAID,
				previousFulfillmentStatus: found.fulfillmentStatus,
				newFulfillmentStatus: FulfillmentStatus.PROCESSING,
				authorId: adminUser.id,
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				metadata: {
					stockAdjusted,
					itemsCount: found.items.length,
					// EINV-CASH-002 : preuve d'audit du statut PI au moment du marquage
					// + attestation hors-Stripe éventuelle de l'admin.
					piStatus,
					...(confirmOffStripePayment && { offStripeConfirmed: true }),
					...(isRecovery && { recoveredFrom: found.paymentStatus }),
				},
			});

			return { ...found, _stockAdjusted: stockAdjusted, _stockChanged: stockChanged };
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			const message =
				order._error === "already_paid"
					? ORDER_ERROR_MESSAGES.ALREADY_PAID
					: order._error === "already_refunded"
						? "Cette commande a déjà été remboursée (totalement ou partiellement)."
						: order._error === "has_pending_refund"
							? "Un remboursement est en cours pour cette commande. Annulez-le d'abord."
							: order._error === "no_stripe_proof"
								? "Cette commande n'a aucun PaymentIntent Stripe. Le marquage manuel est interdit sans origine Stripe."
								: order._error === "not_markable"
									? "Seule une commande en attente ou en préparation peut être marquée comme payée."
									: ORDER_ERROR_MESSAGES.CANNOT_PAY_CANCELLED;
			return {
				status: ActionStatus.ERROR,
				message,
			};
		}

		// Invalider les caches (orders list admin + commandes user)
		getOrderInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		// Invalidation STOCK/CATALOGUE — cet encaissement décrémente l'inventaire et
		// ne postait QUE des tags commande : la vitrine servait donc un stock périmé
		// jusqu'à l'expiration du profil `catalog` (5 min revalidate / 15 min stale),
		// et l'inventaire admin jusqu'à celle du profil `user`. Le chemin webhook
		// appelait déjà `collectStockInvalidationTags` — parité rétablie.
		if (order._stockChanged.length > 0) {
			const productIds = [...new Set(order._stockChanged.map((s) => s.productId))];
			const products = await prisma.product.findMany({
				where: { id: { in: productIds } },
				select: { id: true, slug: true },
			});
			const slugByProductId = new Map(products.map((p) => [p.id, p.slug]));
			const tags = collectStockInvalidationTags(
				order._stockChanged.map((s) => ({
					skuId: s.skuId,
					productId: s.productId,
					productSlug: slugByProductId.get(s.productId),
				})),
			);
			tags.forEach((tag) => updateTag(tag));
		}

		// ORD-BIZ-007 : annule le PaymentIntent Stripe en parallèle (si encore actif)
		// pour éviter qu'un client paie en double via le lien checkout original
		// après que l'admin a marqué la commande payée hors Stripe.
		// Best-effort post-commit : ne PAS rollback si Stripe refuse (PaymentIntent
		// déjà succeeded/canceled — Stripe retourne payment_intent_unexpected_state
		// qu'on logge sans bloquer).
		if (order.stripePaymentIntentId) {
			try {
				const { stripe } = await import("@/shared/lib/stripe");
				await stripe.paymentIntents.cancel(order.stripePaymentIntentId, {
					cancellation_reason: "abandoned",
				});
				logger.info(
					`[mark-as-paid] PaymentIntent ${order.stripePaymentIntentId} annulé (manuel hors Stripe)`,
					{ action: "mark-as-paid", orderId: order.id },
				);
			} catch (cancelError) {
				const message = cancelError instanceof Error ? cancelError.message : String(cancelError);
				// payment_intent_unexpected_state = PI déjà succeeded/canceled : OK.
				// Tout autre erreur = Sentry warning (double-charge possible si PI encore ouvert).
				const isExpectedTerminalState = message.includes("payment_intent_unexpected_state");
				if (!isExpectedTerminalState) {
					Sentry.withScope((scope) => {
						scope.setLevel("warning");
						scope.setTag("payments", "mark-as-paid-cancel-pi-failed");
						scope.setContext("order", {
							orderId: order.id,
							orderNumber: order.orderNumber,
							stripePaymentIntentId: order.stripePaymentIntentId,
						});
						Sentry.captureException(cancelError);
					});
					logger.warn(
						`[mark-as-paid] PaymentIntent ${order.stripePaymentIntentId} cancel failed — double-charge possible`,
						{
							action: "mark-as-paid",
							orderId: order.id,
							error: message,
						},
					);
				}
			}
		}

		// EINV-CASH-005 : émission eager de la facture (Art. 289-I — émission à
		// l'encaissement), comme le fait le webhook sur le chemin canonique.
		// reconcileInvoiceOrder exécute les mêmes passes que le cron (invoiceNumber,
		// archive PDF) et baisse le flag DLQ posé dans la tx. Best-effort : sur
		// échec le flag reste posé et le cron quotidien reconcile-invoices draine
		// (import dynamique — la chaîne d'archivage tire UploadThing à l'import).
		try {
			const { reconcileInvoiceOrder } =
				await import("@/modules/cron/services/reconcile-invoices.service");
			await reconcileInvoiceOrder(order.id);
		} catch (reconcileError) {
			Sentry.withScope((scope) => {
				scope.setLevel("warning");
				scope.setTag("invoices", "mark-as-paid-eager-reconcile-failed");
				scope.setContext("order", { orderId: order.id, orderNumber: order.orderNumber });
				Sentry.captureException(reconcileError);
			});
			logger.warn(
				`[mark-as-paid] Rattrapage facture eager échoué pour ${order.orderNumber} — le cron reconcile-invoices drainera (flags DLQ posés)`,
				{ action: "mark-as-paid", orderId: order.id },
			);
		}

		// Send order confirmation email for manual payment
		let emailSent = false;
		if (order.customerEmail) {
			// AUDIT-BIZ-001 : SSOT partagé avec le webhook et resend-order-email
			// (route invité tokenisée si `userId` est null).
			const trackingUrl = buildOrderTrackingUrl(order);
			try {
				await sendOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: order.customerName || "Client",
					items: order.items.map((item) => ({
						productTitle: item.productTitle,
						skuColor: item.skuColor,
						skuColorHexes: item.skuColorHexes,
						skuMaterial: item.skuMaterial,
						skuSize: item.skuSize,
						quantity: item.quantity,
						price: item.price,
					})),
					subtotal: order.subtotal,
					discount: order.discountAmount,
					shipping: order.shippingCost,
					total: order.total,
					shippingAddress: {
						firstName: order.shippingFirstName || "",
						lastName: order.shippingLastName || "",
						address1: order.shippingAddress1 || "",
						address2: order.shippingAddress2,
						postalCode: order.shippingPostalCode || "",
						city: order.shippingCity || "",
						country: order.shippingCountry || "France",
					},
					trackingUrl,
					invoiceUrl: buildUrl(
						`/api/orders/${encodeURIComponent(order.orderNumber)}/invoice?token=${generateInvoiceAccessToken(order.id, order.orderNumber)}`,
					),
					// EMAIL-AUDIT-003 : même convention que le webhook (`order-confirm:${id}`)
					// pour qu'un mark-as-paid manuel post-webhook ne ré-envoie pas.
					idempotencyKey: `order-confirm-${order.id}`,
				});
				emailSent = true;
			} catch (emailError) {
				logger.error("Échec envoi email", emailError, { action: "mark-as-paid" });
			}
		}

		const stockMessage =
			order._stockAdjusted && order.items.length > 0
				? ` Stock décrémenté pour ${order.items.length} article(s).`
				: "";

		const emailMessage = emailSent
			? " Email envoyé au client."
			: order.customerEmail
				? " (Échec envoi email)"
				: "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} marquée comme payée. Prête pour préparation.${stockMessage}${emailMessage}`,
		};
	} catch (e) {
		if (e instanceof Error && e.message === "CONCURRENT_STATE_CHANGE") {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CONCURRENT_CHANGE,
			};
		}
		return handleActionError(e, ORDER_ERROR_MESSAGES.MARK_AS_PAID_FAILED);
	}
}
