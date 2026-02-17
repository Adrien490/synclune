import { prisma } from "@/shared/lib/prisma"
import { sendReviewRequestEmail } from "@/modules/emails/services/review-emails"
import { SITE_URL } from "@/shared/constants/seo-config"
import {
	success,
	notFound,
	error,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"

import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"
import { getOrderForReviewRequest } from "../data/get-order-for-review-request"

/**
 * Logique metier pour envoyer un email de demande d'avis
 * Utilisee par l'action publique et les services internes (cron, webhooks)
 */
export async function executeReviewRequestEmail(orderId: string): Promise<ActionState> {
	// 1. Recuperer la commande avec les items et les avis existants (via data/)
	const order = await getOrderForReviewRequest(orderId)

	if (!order) {
		return notFound("Commande")
	}

	if (order.fulfillmentStatus !== "DELIVERED") {
		return validationError("La commande n'est pas encore livree")
	}

	if (!order.user?.email) {
		return validationError("Utilisateur sans email")
	}

	// 2. Filtrer les items qui n'ont pas encore d'avis
	const itemsWithoutReview = order.items.filter((item) => !item.review)

	if (itemsWithoutReview.length === 0) {
		return validationError("Tous les produits ont deja un avis")
	}

	// 3. Dedupliquer par produit (un client peut avoir commande le meme produit plusieurs fois)
	const productsMap = new Map<
		string,
		{
			title: string
			slug: string
			imageUrl: string | null
			skuVariants: string | null
		}
	>()

	for (const item of itemsWithoutReview) {
		const product = item.sku.product
		if (!productsMap.has(product.id)) {
			const variants = [
				item.sku.color?.name,
				item.sku.material?.name,
				item.sku.size,
			]
				.filter(Boolean)
				.join(" · ")

			productsMap.set(product.id, {
				title: product.title,
				slug: product.slug,
				imageUrl: item.sku.images[0]?.url || null,
				skuVariants: variants || null,
			})
		}
	}

	const products = Array.from(productsMap.values())

	// 4. URL vers la page "Mes avis"
	const reviewUrl = `${SITE_URL}/mes-avis`

	// 5. Mark reviewRequestSentAt BEFORE sending (optimistic lock to prevent duplicates on crash/timeout)
	await prisma.order.update({
		where: { id: orderId },
		data: { reviewRequestSentAt: new Date() },
	})

	// 6. Send email
	const result = await sendReviewRequestEmail({
		to: order.user.email,
		customerName: order.user.name || "Cliente",
		orderNumber: order.orderNumber,
		products,
		reviewUrl,
	})

	if (!result.success) {
		// Rollback on failure so the next cron run can retry
		await prisma.order.update({
			where: { id: orderId },
			data: { reviewRequestSentAt: null },
		})
		return error(REVIEW_ERROR_MESSAGES.EMAIL_FAILED)
	}

	return success(`Email de demande d'avis envoye a ${order.user.email}`)
}

/**
 * Helper pour envoyer un email de demande d'avis de maniere programmatique
 * Utilise par les services internes (cron, webhooks, actions admin)
 *
 * NOT a "use server" function - cannot be called from the client
 *
 * @param orderId - L'ID de la commande
 */
export async function sendReviewRequestEmailInternal(
	orderId: string
): Promise<ActionState> {
	try {
		return await executeReviewRequestEmail(orderId)
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.EMAIL_FAILED)
	}
}
