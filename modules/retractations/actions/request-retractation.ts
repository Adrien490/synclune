"use server";

import { Prisma } from "@/app/generated/prisma/client";
import { sendRetractationAckEmail } from "@/modules/emails/services/send-retractation-emails";
import { verifyOrderTrackingToken } from "@/modules/orders/lib/order-tracking-token";
import { error, handleActionError, success, validateInput } from "@/shared/lib/actions";
import { updateTagsAfterMutation } from "@/shared/lib/cache";
import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";
import type { ActionState } from "@/shared/types/server-action";
import { getRetractationInvalidationTags } from "../constants/cache";
import { requestRetractationSchema } from "../schemas/retractation.schemas";

/**
 * Demande de rétractation — Server Action PUBLIQUE (fonctionnalité en ligne
 * obligatoire depuis le 19 juin 2026).
 *
 * Garde d'accès = le token HMAC du lien de suivi, vérifié CONTRE l'email en
 * base AVANT toute autre lecture ou écriture — pas d'accès par simple
 * orderId (anti-énumération). Un token invalide rend la même erreur qu'une
 * commande inconnue.
 *
 * La demande naît RECEIVED (`@unique` sur orderId : P2002 = « demande déjà
 * enregistrée », même pour une demande rejetée — une seule demande par
 * commande, l'échange continue par email). L'accusé de réception part
 * IMMÉDIATEMENT ; s'il réussit, la demande passe ACKNOWLEDGED dans la
 * foulée — RECEIVED n'est un état durable que si l'envoi échoue.
 *
 * Une demande HORS DÉLAI reste acceptée ici (c'est un droit de demande) :
 * l'admin voit l'éligibilité calculée et peut rejeter.
 */
export async function requestRetractation(
	_prevState: ActionState | undefined,
	formData: FormData,
): Promise<ActionState> {
	// Parse AVANT de dériver quoi que ce soit de l'argument (endpoint RPC).
	const validation = validateInput(requestRetractationSchema, {
		orderId: formData.get("orderId"),
		token: formData.get("token"),
		reason: formData.get("reason"),
	});
	if ("error" in validation) return validation.error;
	const { orderId, token, reason } = validation.data;

	const secret = process.env.AUTH_SECRET;
	if (!secret) {
		logger.error("[requestRetractation] AUTH_SECRET manquant — fail-closed");
		return error("La demande est indisponible pour le moment. Réessaie plus tard.");
	}

	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: {
				id: true,
				invoiceNumber: true,
				email: true,
				customerName: true,
				status: true,
			},
		});

		// Même message pour « commande inconnue » et « token faux ».
		if (!order || !order.email || !verifyOrderTrackingToken(token, order.id, order.email, secret)) {
			return error("Ce lien de suivi n'est pas valide.");
		}

		// Un droit de rétractation suppose une commande encaissée non remboursée.
		if (order.status !== "PAID" && order.status !== "SHIPPED") {
			return error("Cette commande ne peut pas faire l'objet d'une rétractation.");
		}

		let retractationId: string;
		try {
			const retractation = await prisma.retractationRequest.create({
				data: { orderId: order.id, reason, status: "RECEIVED" },
				select: { id: true },
			});
			retractationId = retractation.id;
		} catch (e) {
			if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
				return error(
					"Une demande de rétractation est déjà enregistrée pour cette commande. Pour toute question, réponds à ton email de confirmation.",
				);
			}
			throw e;
		}

		// Accusé de réception SANS DÉLAI ; s'il part, la demande passe ACKNOWLEDGED.
		const ack = await sendRetractationAckEmail({ order, reason });
		if (ack.success) {
			await prisma.retractationRequest.updateMany({
				where: { id: retractationId, status: "RECEIVED" },
				data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
			});

			updateTagsAfterMutation(
				getRetractationInvalidationTags({ retractationId, orderId: order.id }),
			);

			return success(
				"Ta demande de rétractation est enregistrée — tu vas recevoir un accusé de réception par email avec la marche à suivre.",
			);
		}

		// RECEIVED reste — l'admin verra une demande sans accusé et relancera.
		// Le message ne promet PAS un accusé automatique qui ne partira pas.
		logger.error("[requestRetractation] Accusé de réception non envoyé", {
			retractationId,
			error: ack.error,
		});

		updateTagsAfterMutation(getRetractationInvalidationTags({ retractationId, orderId: order.id }));

		return success(
			"Ta demande de rétractation est bien enregistrée — on revient vers toi par email avec la marche à suivre.",
		);
	} catch (e) {
		return handleActionError(e, "Impossible d'enregistrer ta demande. Réessaie.");
	}
}
