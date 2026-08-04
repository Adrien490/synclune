"use server";

import { OrderStatus, HistorySource } from "@/app/generated/prisma/client";
import { requireAdminWithUser } from "@/modules/auth/lib/require-auth";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import {
	sendOrderConfirmationEmail,
	sendShippingConfirmationEmail,
} from "@/modules/emails/services/order-emails";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, success, error } from "@/shared/lib/actions";
import { ORDERS_CACHE_TAGS } from "@/modules/orders/constants/cache";
import { enforceRateLimitForCurrentUser } from "@/modules/auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { getCarrierLabel, type Carrier } from "@/modules/orders/utils/carrier.utils";
import { generateInvoiceAccessToken } from "@/modules/orders/utils/invoice-token";
import { buildOrderTrackingUrl } from "@/modules/orders/utils/build-order-tracking-url";
import { buildUrl } from "@/shared/constants/urls";
import { updateTag } from "next/cache";
import { z } from "zod";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { createOrderAudit } from "../utils/order-audit";
import { extractCustomerFirstName } from "../utils/customer-name";

// Re-export du type pour compatibilité
export type { ResendEmailType } from "../types/email.types";

/**
 * Server Action ADMIN pour renvoyér un email de commande
 *
 * EMAIL-AUDIT-003 : volontairement SANS `idempotencyKey` Resend — l'admin clique
 * ce bouton précisément pour bypass la dedup (ex: client dit "je n'ai rien reçu").
 * Protection contre double-clic = rate-limit `ADMIN_ORDER_LIMITS.RESEND_EMAIL`
 * appliqué dès l'entrée.
 *
 * IDEM-EMAIL-001 (audit idempotence 2026-07-26) : omettre `idempotencyKey` ne
 * suffisait PAS. Le cache de dédup IN-PROCESS de `send-email.ts` est indexé sur un
 * hash de contenu (`to+subject+html[0:4096]`), pas sur la clé : sur une instance
 * chaude, un renvoi < 10 min était court-circuité et renvoyait l'ancien `resendId`
 * en `success` SANS réexpédier — l'admin voyait « email renvoyé », le client ne
 * recevait rien. D'où `skipIdempotence: true` sur les deux branches.
 */
// `unknown` et non des types nominaux : un fichier "use server" publie chaque
// export en endpoint RPC — le type d'un paramètre est effacé à l'exécution.
// Parser AVANT de dériver quoi que ce soit de l'argument (règle CLAUDE.md).
export async function resendOrderEmail(
	orderIdInput: unknown,
	emailTypeInput: unknown,
): Promise<ActionState> {
	try {
		// 1. Vérification admin (`WithUser` : l'entrée d'audit du renvoi nomme l'auteur)
		const auth = await requireAdminWithUser();
		if ("error" in auth) return auth.error;
		const { user: adminUser } = auth;
		// 2. Rate limiting
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.RESEND_EMAIL);
		if ("error" in rateLimit) return rateLimit.error;

		// 3. Validate orderId and emailType
		const validated = validateInput(
			z.object({
				orderId: z.cuid2(),
				emailType: z.enum(["confirmation", "shipping"]),
			}),
			{ orderId: orderIdInput, emailType: emailTypeInput },
		);
		if ("error" in validated) return validated.error;
		const { orderId, emailType } = validated.data;

		// 4. Récupérer la commande avec uniquement les champs nécessaires
		const order = await prisma.order.findUnique({
			where: { id: orderId, ...notDeleted },
			select: {
				orderNumber: true,
				status: true,
				id: true,
				// AUDIT-BIZ-001 : requis par `buildOrderTrackingUrl` pour router les
				// commandes invité (userId null) vers le suivi tokenisé.
				customerEmail: true,
				customerName: true,
				subtotal: true,
				shippingCost: true,
				total: true,
				shippingFirstName: true,
				shippingLastName: true,
				shippingAddress1: true,
				shippingAddress2: true,
				shippingPostalCode: true,
				shippingCity: true,
				shippingCountry: true,
				shippingCarrier: true,
				trackingNumber: true,
				trackingUrl: true,
				// Sans cette colonne le renvoi perdait la ligne « Livraison estimée » :
				// le mail renvoyé n'était pas une copie fidèle de l'original.
				estimatedDelivery: true,
				items: {
					select: {
						productTitle: true,
						skuColor: true,
						skuColorHexes: true,
						skuMaterial: true,
						skuSize: true,
						quantity: true,
						price: true,
					},
				},
			},
		});

		if (!order) {
			return error("Commande non trouvée");
		}

		// 5. Vérifier que l'email peut être envoyé selon le type et l'envoyer
		let actionResult: ActionState;

		switch (emailType) {
			case "confirmation": {
				// Email de confirmation toujours possible
				const result = await sendOrderConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: extractCustomerFirstName(order.customerName, order.shippingFirstName),
					items: order.items,
					subtotal: order.subtotal,
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
					trackingUrl: buildOrderTrackingUrl(order),
					invoiceUrl: buildUrl(
						`/api/orders/${encodeURIComponent(order.orderNumber)}/invoice?token=${generateInvoiceAccessToken(order.id, order.orderNumber)}`,
					),
					// IDEM-EMAIL-001 : renvoi explicite → contourner le cache in-process.
					skipIdempotence: true,
				});

				actionResult = result.success
					? success("Email de confirmation renvoyé")
					: error("Erreur lors de l'envoi de l'email de confirmation");
				break;
			}

			case "shipping": {
				// Vérifier que la commande a été expédiée
				if (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
					return error("La commande n'a pas encore été expédiée");
				}

				if (!order.trackingNumber) {
					return error("Aucun numéro de suivi disponible");
				}

				const carrierLabel = getCarrierLabel((order.shippingCarrier ?? "autre") as Carrier);

				const result = await sendShippingConfirmationEmail({
					to: order.customerEmail,
					orderNumber: order.orderNumber,
					customerName: extractCustomerFirstName(order.customerName, order.shippingFirstName),
					trackingNumber: order.trackingNumber,
					trackingUrl: order.trackingUrl,
					// Repli si le transporteur n'expose pas d'URL de suivi ("autre").
					orderTrackingUrl: buildOrderTrackingUrl(order),
					carrierLabel,
					// Parité avec le premier envoi (`mark-as-shipped`) : même format.
					estimatedDelivery: order.estimatedDelivery
						? format(order.estimatedDelivery, "d MMMM yyyy", { locale: fr })
						: null,
					shippingAddress: {
						firstName: order.shippingFirstName || "",
						lastName: order.shippingLastName || "",
						address1: order.shippingAddress1 || "",
						address2: order.shippingAddress2,
						postalCode: order.shippingPostalCode || "",
						city: order.shippingCity || "",
						country: order.shippingCountry || "France",
					},
					// IDEM-EMAIL-001 : renvoi explicite → contourner le cache in-process.
					skipIdempotence: true,
				});

				actionResult = result.success
					? success("Email d'expedition renvoyé")
					: error("Erreur lors de l'envoi de l'email d'expedition");
				break;
			}

			default:
				return error("Type d'email invalide");
		}

		if (actionResult.status === ActionStatus.SUCCESS) {
			// Un renvoi est une action client-facing : elle doit laisser une trace,
			// sinon l'invalidation du tag HISTORY ci-dessous ne recharge rien.
			// `OrderAction` n'a pas de valeur « EMAIL_RESENT » et en ajouter une
			// imposerait de recréer le type Postgres sur un historique baseliné :
			// on réutilise l'action du domaine + une note, comme le fait déjà la
			// trace post-commit de `mark-as-shipped`.
			await createOrderAudit({
				orderId,
				action: emailType === "shipping" ? "SHIPPED" : "CREATED",
				note:
					emailType === "shipping"
						? "Email d'expédition renvoyé manuellement au client"
						: "Email de confirmation renvoyé manuellement au client",
				authorName: adminUser.name ?? "Admin",
				source: HistorySource.ADMIN,
				// Pas de clé `emailType` : `sanitizeAuditMetadata` la rejette (motif
				// PII-like « email »), à raison — `OrderHistory.metadata` est exposée au
				// client et jamais scrubée. Le type est déjà porté par `note` + `action`.
				metadata: { resent: true },
			});

			// HISTORY() ne tague que `getOrderHistory()`. La timeline de la page détail lit
			// `order.history` via `GET_ORDER_SELECT_ADMIN` dans `getOrderById()`, dont le
			// cache est tagué DETAIL(id) : sans cette seconde invalidation, l'entrée
			// d'audit qu'on vient d'écrire n'apparaissait pas sur la page.
			updateTag(ORDERS_CACHE_TAGS.HISTORY(orderId));
			updateTag(ORDERS_CACHE_TAGS.DETAIL(orderId));
		}

		return actionResult;
	} catch (e) {
		return handleActionError(e, "Une erreur est survenue lors de l'envoi");
	}
}
