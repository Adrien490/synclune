"use server"

import {
	requireAdmin,
	enforceRateLimitForCurrentUser,
	success,
	error,
	validationError,
} from "@/shared/lib/actions"
import { prisma } from "@/shared/lib/prisma"
import { ADMIN_LIMITS } from "@/shared/lib/rate-limit-config"
import type { ActionState } from "@/shared/types/server-action"
import { updateTag } from "next/cache"

import { getTestimonialInvalidationTags } from "../constants/cache"
import { createTestimonialSchema } from "../schemas/testimonial.schemas"

export async function createTestimonial(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const adminCheck = await requireAdmin()
		if ("error" in adminCheck) return adminCheck.error

		// 2. Rate limiting
		const rateLimitCheck = await enforceRateLimitForCurrentUser(
			ADMIN_LIMITS.TESTIMONIAL_CREATE
		)
		if ("error" in rateLimitCheck) return rateLimitCheck.error

		// 3. Extraire les données du FormData
		const rawData = {
			authorName: formData.get("authorName"),
			content: formData.get("content"),
			imageUrl: formData.get("imageUrl") || undefined,
			isPublished: formData.get("isPublished") === "true",
		}

		// 4. Valider les données
		const validation = createTestimonialSchema.safeParse(rawData)

		if (!validation.success) {
			const firstError = validation.error.issues?.[0]
			return validationError(firstError?.message || "Données invalides")
		}

		// 5. Créer le témoignage
		const testimonial = await prisma.testimonial.create({
			data: {
				authorName: validation.data.authorName,
				content: validation.data.content,
				imageUrl: validation.data.imageUrl,
				isPublished: validation.data.isPublished,
			},
		})

		// 6. Invalider le cache
		const tags = getTestimonialInvalidationTags(testimonial.id)
		tags.forEach((tag) => updateTag(tag))

		return success("Témoignage créé avec succès", { id: testimonial.id })
	} catch (e) {
		console.error("[createTestimonial] Erreur:", e)
		return error("Une erreur est survenue lors de la création du témoignage")
	}
}
