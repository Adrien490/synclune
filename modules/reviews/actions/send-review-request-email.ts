"use server"

import { prisma } from "@/shared/lib/prisma"
import { sendReviewRequestEmail } from "@/shared/lib/email"
import { SITE_URL } from "@/shared/constants/seo-config"
import {
	requireAdmin,
	success,
	notFound,
	error,
	validationError,
	handleActionError,
} from "@/shared/lib/actions"
import type { ActionState } from "@/shared/types/server-action"

import { REVIEW_ERROR_MESSAGES } from "../constants/review.constants"

/**
 * Logique metier pour envoyer un email de demande d'avis
 * Utilisee par l'action publique et la fonction interne
 */
async function executeReviewRequestEmail(orderId: string): Promise<ActionState> {
	// 1. Recuperer la commande avec les items et les avis existants
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
				},
			},
			items: {
				include: {
					sku: {
						include: {
							product: {
								select: {
									id: true,
									title: true,
									slug: true,
								},
							},
							color: {
								select: { name: true },
							},
							material: {
								select: { name: true },
							},
							images: {
								where: { isPrimary: true },
								take: 1,
								select: { url: true },
							},
						},
					},
					review: {
						select: { id: true },
					},
				},
			},
		},
	})

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

	// 5. Envoyer l'email
	const result = await sendReviewRequestEmail({
		to: order.user.email,
		customerName: order.user.name || "Cliente",
		orderNumber: order.orderNumber,
		products,
		reviewUrl,
	})

	if (!result.success) {
		return error(REVIEW_ERROR_MESSAGES.EMAIL_FAILED)
	}

	// 6. Marquer la commande comme ayant recu l'email de demande d'avis
	await prisma.order.update({
		where: { id: orderId },
		data: {
			reviewRequestSentAt: new Date(),
		},
	})

	return success(`Email de demande d'avis envoye a ${order.user.email}`)
}

/**
 * Helper pour envoyer un email de demande d'avis de maniere programmatique
 * Utilise par les services internes (webhooks, bulk actions)
 *
 * NOTE: Cette fonction ne verifie pas les droits admin car elle est appelee
 * depuis des contextes deja securises (webhooks avec signature verifiee,
 * actions admin deja authentifiees)
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

/**
 * Envoie un email de demande d'avis pour une commande livree
 * Action admin uniquement (pour les formulaires)
 *
 * Conditions:
 * - La commande doit etre livree (fulfillmentStatus = DELIVERED)
 * - L'utilisateur doit avoir un email
 * - Il doit y avoir au moins un produit sans avis existant
 */
export async function sendReviewRequestEmailAction(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Verification admin
		const adminCheck = await requireAdmin()
		if ("error" in adminCheck) return adminCheck.error

		// 2. Extraire l'orderId du FormData
		const orderId = formData.get("orderId") as string
		if (!orderId) {
			return validationError("orderId: L'identifiant de commande est requis")
		}

		// 3. Executer la logique metier
		return await executeReviewRequestEmail(orderId)
	} catch (e) {
		return handleActionError(e, REVIEW_ERROR_MESSAGES.EMAIL_FAILED)
	}
}
