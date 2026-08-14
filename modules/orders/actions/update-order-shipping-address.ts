"use server";

import { OrderStatus } from "@/app/generated/prisma/client";
import { requireAdmin } from "@/modules/admin-auth/lib/require-admin";
import { ADMIN_DISPLAY_NAME } from "@/modules/admin-auth/constants/admin-auth.constants";
import { enforceRateLimitForCurrentUser } from "@/modules/admin-auth/lib/rate-limit-helpers";
import { ADMIN_ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { validateInput, handleActionError, safeFormGet } from "@/shared/lib/actions";
import { sanitizeText } from "@/shared/lib/sanitize";
import { updateTag } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { getOrderMetadataInvalidationTags } from "../constants/cache";
import { updateOrderShippingAddressSchema } from "../schemas/order.schemas";
import { createOrderAuditTx } from "../utils/order-audit";

/**
 * Updates the shipping address of an order before shipment
 * Admin only - used to correct address errors before dispatch
 *
 * Business rules:
 * - Order must not already be shipped or delivered
 * - Only pre-shipment orders can have their address corrected
 *
 * ## Pourquoi cette action porte AUSSI deux gardes comptables (audit 2026-08-07)
 *
 * Depuis le retrait des 9 colonnes `Order.billing*` (2026-08-04), `buildBillingAddress`
 * est l'identité : `shipping*` EST l'adresse imprimée sous « Facturé à »
 * (`modules/invoices/services/build-invoice-data.ts`). L'adresse de livraison est donc
 * devenue une donnée FISCALE sans que sa garde d'écriture ne suive — elle ne se
 * verrouillait qu'à l'expédition, soit des jours après l'émission de la facture.
 *
 * ⚠️ Un gate dur `invoiceNumber !== null` serait le mauvais correctif : la facture est
 * posée dans les secondes suivant le paiement (webhook → `ensureInvoiceNumberPersisted`),
 * donc l'adresse ne serait JAMAIS corrigeable. C'est exactement ce qui rendait l'ancienne
 * action `update-order-billing-address` inutile — ses colonnes sont restées NULL sur
 * toute commande réelle, puis ont été droppées. Corriger une rue avant expédition reste
 * le cas d'usage légitime et prioritaire : un colis mal adressé est un préjudice réel.
 *
 * On ne bloque donc que les deux fenêtres où l'édition CORROMPRAIT une pièce comptable :
 *  1. `creditNoteNumber` posé — l'avoir est rendu depuis ces colonnes VIVANTES
 *     (`render-order-credit-note.service.ts`) et archivé eagerly : rééditer ferait
 *     diverger l'avoir de la facture qu'il corrige (Art. 272-I CGI).
 *  2. `invoiceNumber` posé mais `invoicePdfUrl` NULL — l'archivage eager a échoué, et
 *     `reconcile-invoices` va REGÉNÉRER le PDF depuis ces colonnes puis le sceller sous
 *     SHA-256 pour dix ans (Art. L102 B LPF). Le cron passe une fois par jour (plafond
 *     Hobby) : la fenêtre vaut jusqu'à 24 h. Refus TEMPORAIRE, pas définitif.
 *
 * Hors de ces deux fenêtres, l'édition reste autorisée jusqu'à l'expédition — la facture
 * déjà archivée fait foi et conserve l'adresse d'origine, ce que l'admin est averti dans
 * `edit-shipping-address-form.tsx` et ce que trace `metadata.invoiceAlreadyIssued`.
 */
const REFUSAL_MESSAGES = {
	already_shipped: ORDER_ERROR_MESSAGES.CANNOT_UPDATE_ADDRESS_SHIPPED,
	credit_note_issued: ORDER_ERROR_MESSAGES.CANNOT_UPDATE_ADDRESS_CREDIT_NOTE,
	invoice_archiving: ORDER_ERROR_MESSAGES.CANNOT_UPDATE_ADDRESS_INVOICE_ARCHIVING,
} as const;

export async function updateOrderShippingAddress(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	try {
		const auth = await requireAdmin();
		if ("error" in auth) return auth.error;
		const rateLimit = await enforceRateLimitForCurrentUser(ADMIN_ORDER_LIMITS.SINGLE_OPERATIONS);
		if ("error" in rateLimit) return rateLimit.error;

		const rawData = {
			id: safeFormGet(formData, "id"),
			shippingFirstName: safeFormGet(formData, "shippingFirstName"),
			shippingLastName: safeFormGet(formData, "shippingLastName"),
			shippingAddress1: safeFormGet(formData, "shippingAddress1"),
			shippingAddress2: safeFormGet(formData, "shippingAddress2") ?? undefined,
			shippingPostalCode: safeFormGet(formData, "shippingPostalCode"),
			shippingCity: safeFormGet(formData, "shippingCity"),
			shippingCountry: safeFormGet(formData, "shippingCountry") ?? "FR",
			shippingPhone: safeFormGet(formData, "shippingPhone") ?? undefined,
		};

		const validated = validateInput(updateOrderShippingAddressSchema, rawData);
		if ("error" in validated) return validated.error;

		const { id, ...addressData } = validated.data;

		// Transaction: fetch + validate + update + audit atomically
		const order = await prisma.$transaction(async (tx) => {
			const found = await tx.order.findUnique({
				where: { id, ...notDeleted },
				select: {
					id: true,
					orderNumber: true,
					// Portait `fulfillmentStatus` jusqu'au Lot 4 : la garde « pas après
					// expédition » lit désormais l'axe unique.
					status: true,
					// Les trois colonnes des gardes comptables (cf. docblock).
					invoiceNumber: true,
					invoicePdfUrl: true,
					creditNoteNumber: true,
					shippingFirstName: true,
					shippingLastName: true,
					shippingAddress1: true,
					shippingAddress2: true,
					shippingPostalCode: true,
					shippingCity: true,
					shippingCountry: true,
					shippingPhone: true,
				},
			});

			if (!found) return null;

			// Cannot update address after shipment. Lu sur `status` depuis le Lot 4 —
			// mêmes trois valeurs, un seul axe.
			if (
				found.status === OrderStatus.SHIPPED ||
				found.status === OrderStatus.DELIVERED ||
				found.status === OrderStatus.RETURNED
			) {
				return { ...found, _error: "already_shipped" as const };
			}

			// Garde comptable 1 — un avoir est déjà scellé sur ces colonnes (Art. 272-I).
			if (found.creditNoteNumber !== null) {
				return { ...found, _error: "credit_note_issued" as const };
			}

			// Garde comptable 2 — facture numérotée dont l'archive n'est pas encore
			// écrite : `reconcile-invoices` régénère le PDF depuis ces colonnes et le
			// scelle (Art. L102 B LPF). Refus TEMPORAIRE, levé dès que l'archive existe.
			if (found.invoiceNumber !== null && found.invoicePdfUrl === null) {
				return { ...found, _error: "invoice_archiving" as const };
			}

			const sanitizedData = {
				shippingFirstName: sanitizeText(addressData.shippingFirstName),
				shippingLastName: sanitizeText(addressData.shippingLastName),
				shippingAddress1: sanitizeText(addressData.shippingAddress1),
				shippingAddress2: addressData.shippingAddress2
					? sanitizeText(addressData.shippingAddress2)
					: null,
				shippingPostalCode: sanitizeText(addressData.shippingPostalCode),
				shippingCity: sanitizeText(addressData.shippingCity),
				shippingCountry: addressData.shippingCountry,
				// `shippingPhone` est NOT NULL en base : un champ vidé revient à la
				// chaîne vide, jamais à NULL (le schéma Zod accepte `""`).
				shippingPhone: addressData.shippingPhone ? sanitizeText(addressData.shippingPhone) : "",
			};

			await tx.order.update({
				where: { id },
				data: sanitizedData,
			});

			// Audit trail (Art. L123-22 Code de Commerce). `addressType: "shipping"`
			// est conservé bien qu'il n'existe plus qu'un seul type d'adresse depuis
			// le retrait des colonnes `billing*` (2026-08-04) : les entrées d'audit
			// déjà écrites le portent, et un filtre par type doit continuer de les
			// retrouver — la table est immuable pendant 10 ans.
			// ⚠️ RGPD (audit rétention 10 ans 2026-07-09) : ne JAMAIS écrire de
			// valeurs d'adresse dans OrderHistory.metadata — la table est immuable
			// 10 ans, jamais scrubée à l'anonymisation ni à la purge. `changedFields`
			// trace qui/quand/quels champs (suffisant pour L123-22) ; les valeurs
			// probantes vivent sur le snapshot Order et la facture figée.
			await createOrderAuditTx(tx, {
				orderId: id,
				action: "ADDRESS_UPDATED",
				authorName: ADMIN_DISPLAY_NAME,
				note: "Adresse de livraison modifiée",
				metadata: {
					addressType: "shipping",
					changedFields: Object.keys(sanitizedData),
					// Booléen, jamais une valeur : trace qu'une facture ARCHIVÉE conserve
					// l'adresse précédente. C'est le seul endroit où l'écart entre la pièce
					// scellée et la colonne vivante reste lisible dix ans plus tard.
					invoiceAlreadyIssued: found.invoiceNumber !== null,
				},
			});

			return found;
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		if ("_error" in order) {
			return {
				status: ActionStatus.ERROR,
				message: REFUSAL_MESSAGES[order._error],
			};
		}

		// Invalidate caches
		getOrderMetadataInvalidationTags(order.id).forEach((tag) => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: `Adresse de livraison mise à jour pour la commande ${order.orderNumber}.`,
		};
	} catch (e) {
		return handleActionError(e, ORDER_ERROR_MESSAGES.UPDATE_SHIPPING_ADDRESS_FAILED);
	}
}
