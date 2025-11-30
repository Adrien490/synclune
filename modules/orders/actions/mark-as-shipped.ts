"use server";

import {
	OrderStatus,
	PaymentStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { isAdmin } from "@/modules/auth/utils/guards";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { prisma } from "@/shared/lib/prisma";
import { sendShippingConfirmationEmail } from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getCarrierLabel, getTrackingUrl, toShippingCarrierEnum, type Carrier } from "@/modules/orders/utils/carrier-detection";
import { revalidatePath } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { markAsShippedSchema } from "../schemas/order.schemas";
import { createOrderAudit } from "../utils/order-audit";

/**
 * Marque une commande comme expédiée
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être payée (PaymentStatus.PAID)
 * - La commande ne doit pas être annulée
 * - Requiert un numéro de suivi
 * - Passe OrderStatus à SHIPPED
 * - Passe FulfillmentStatus à SHIPPED
 * - Enregistre le numéro de suivi et la date d'expédition
 * - Envoie un email au client si sendEmail = true
 */
export async function markAsShipped(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		const admin = await isAdmin();
		if (!admin) {
			return {
				status: ActionStatus.UNAUTHORIZED,
				message: "Accès non autorisé",
			};
		}

		// Récupérer les infos de l'admin pour l'audit trail
		const session = await getSession();
		const adminId = session?.user?.id;
		const adminName = session?.user?.name || "Admin";

		const id = formData.get("id") as string;
		const trackingNumber = formData.get("trackingNumber") as string;
		const trackingUrl = formData.get("trackingUrl") as string | null;
		const carrier = formData.get("carrier") as string | null;
		const sendEmail = formData.get("sendEmail") as string | null;

		const result = markAsShippedSchema.safeParse({
			id,
			trackingNumber,
			trackingUrl: trackingUrl || undefined,
			carrier: carrier || undefined,
			sendEmail: sendEmail || "true",
		});

		if (!result.success) {
			return {
				status: ActionStatus.VALIDATION_ERROR,
				message: result.error.issues[0]?.message || "Données invalides",
			};
		}

		// Récupérer la commande avec les données nécessaires pour l'email
		const order = await prisma.order.findUnique({
			where: { id },
			select: {
				id: true,
				orderNumber: true,
				status: true,
				paymentStatus: true,
				fulfillmentStatus: true,
				customerEmail: true,
				customerName: true,
				shippingFirstName: true,
				shippingLastName: true,
				shippingAddress1: true,
				shippingAddress2: true,
				shippingPostalCode: true,
				shippingCity: true,
				shippingCountry: true,
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier si déjà expédiée
		if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.ALREADY_SHIPPED,
			};
		}

		// Vérifier si annulée
		if (order.status === OrderStatus.CANCELLED) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_SHIP_CANCELLED,
			};
		}

		// Vérifier si payée
		if (order.paymentStatus !== PaymentStatus.PAID) {
			return {
				status: ActionStatus.ERROR,
				message: ORDER_ERROR_MESSAGES.CANNOT_SHIP_UNPAID,
			};
		}

		// Générer l'URL de suivi si non fournie
		const carrierValue = (result.data.carrier || "autre") as Carrier;
		const finalTrackingUrl =
			result.data.trackingUrl ||
			getTrackingUrl(carrierValue, result.data.trackingNumber);

		// Mettre à jour la commande
		await prisma.order.update({
			where: { id },
			data: {
				status: OrderStatus.SHIPPED,
				fulfillmentStatus: FulfillmentStatus.SHIPPED,
				trackingNumber: result.data.trackingNumber,
				trackingUrl: finalTrackingUrl,
				shippingCarrier: toShippingCarrierEnum(result.data.carrier),
				shippedAt: new Date(),
			},
		});

		// 🔴 AUDIT TRAIL (Best Practice Stripe 2025)
		await createOrderAudit({
			orderId: id,
			action: "SHIPPED",
			previousStatus: order.status,
			newStatus: OrderStatus.SHIPPED,
			previousFulfillmentStatus: order.fulfillmentStatus,
			newFulfillmentStatus: FulfillmentStatus.SHIPPED,
			authorId: adminId,
			authorName: adminName,
			source: "admin",
			metadata: {
				trackingNumber: result.data.trackingNumber,
				trackingUrl: finalTrackingUrl,
				shippingCarrier: result.data.carrier,
				emailSent: result.data.sendEmail,
			},
		});

		revalidatePath("/admin/ventes/commandes");

		// Envoyer l'email de confirmation d'expédition au client
		if (result.data.sendEmail && order.customerEmail) {
			const carrierLabel = getCarrierLabel(carrierValue);

			// Extraire le prénom du customerName ou utiliser shippingFirstName
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			await sendShippingConfirmationEmail({
				to: order.customerEmail,
				orderNumber: order.orderNumber,
				customerName: customerFirstName,
				trackingNumber: result.data.trackingNumber,
				trackingUrl: finalTrackingUrl,
				carrierLabel,
				shippingAddress: {
					firstName: order.shippingFirstName || "",
					lastName: order.shippingLastName || "",
					address1: order.shippingAddress1 || "",
					address2: order.shippingAddress2,
					postalCode: order.shippingPostalCode || "",
					city: order.shippingCity || "",
					country: order.shippingCountry || "France",
				},
				estimatedDelivery: "3-5 jours ouvrés",
			});
		}

		const emailSent = result.data.sendEmail ? " Email envoyé au client." : "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Commande ${order.orderNumber} expédiée. Numéro de suivi : ${result.data.trackingNumber}.${emailSent}`,
		};
	} catch (error) {
		console.error("[MARK_AS_SHIPPED]", error);
		return {
			status: ActionStatus.ERROR,
			message: ORDER_ERROR_MESSAGES.MARK_AS_SHIPPED_FAILED,
		};
	}
}
