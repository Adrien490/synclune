"use server";

import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/client";
import { isAdmin } from "@/shared/lib/guards";
import { prisma } from "@/shared/lib/prisma";
import { sendTrackingUpdateEmail } from "@/shared/lib/email";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { getCarrierLabel, getTrackingUrl, type Carrier } from "@/shared/utils/carrier-detection";
import { revalidatePath } from "next/cache";

import { ORDER_ERROR_MESSAGES } from "../constants/order.constants";
import { updateTrackingSchema } from "../schemas/order.schemas";

/**
 * Met à jour les informations de suivi d'une commande expédiée
 * Réservé aux administrateurs
 *
 * Règles métier :
 * - La commande doit être expédiée (SHIPPED) ou livrée (DELIVERED)
 * - Met à jour le numéro de suivi, l'URL, le transporteur et la date de livraison estimée
 * - Envoie un email de mise à jour au client si sendEmail = true
 */
export async function updateTracking(
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

		const id = formData.get("id") as string;
		const trackingNumber = formData.get("trackingNumber") as string;
		const trackingUrl = formData.get("trackingUrl") as string | null;
		const carrier = formData.get("carrier") as string | null;
		const estimatedDelivery = formData.get("estimatedDelivery") as string | null;
		const sendEmail = formData.get("sendEmail") as string | null;

		const result = updateTrackingSchema.safeParse({
			id,
			trackingNumber,
			trackingUrl: trackingUrl || undefined,
			carrier: carrier || undefined,
			estimatedDelivery: estimatedDelivery || undefined,
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
				trackingNumber: true,
			},
		});

		if (!order) {
			return {
				status: ActionStatus.NOT_FOUND,
				message: ORDER_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Vérifier si la commande est expédiée ou livrée
		if (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
			return {
				status: ActionStatus.ERROR,
				message: "Impossible de modifier le suivi : la commande n'est pas expédiée.",
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
				trackingNumber: result.data.trackingNumber,
				trackingUrl: finalTrackingUrl,
				shippingCarrier: result.data.carrier,
				estimatedDelivery: result.data.estimatedDelivery,
			},
		});

		revalidatePath("/admin/ventes/commandes");
		revalidatePath(`/compte/commandes/${order.orderNumber}`);

		// Envoyer l'email de mise à jour du suivi au client
		if (result.data.sendEmail && order.customerEmail) {
			const carrierLabel = getCarrierLabel(carrierValue);

			// Extraire le prénom du customerName ou utiliser shippingFirstName
			const customerFirstName =
				order.customerName?.split(" ")[0] ||
				order.shippingFirstName ||
				"Client";

			// Formater la date de livraison estimée
			const estimatedDeliveryStr = result.data.estimatedDelivery
				? result.data.estimatedDelivery.toLocaleDateString("fr-FR", {
						weekday: "long",
						year: "numeric",
						month: "long",
						day: "numeric",
				  })
				: "3-5 jours ouvrés";

			await sendTrackingUpdateEmail({
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
				estimatedDelivery: estimatedDeliveryStr,
			});
		}

		const emailSent = result.data.sendEmail ? " Email envoyé au client." : "";

		return {
			status: ActionStatus.SUCCESS,
			message: `Suivi mis à jour. Nouveau numéro : ${result.data.trackingNumber}.${emailSent}`,
		};
	} catch (error) {
		console.error("[UPDATE_TRACKING]", error);
		return {
			status: ActionStatus.ERROR,
			message: "Erreur lors de la mise à jour du suivi.",
		};
	}
}
