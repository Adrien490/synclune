"use server"

import {
	requireAdmin,
	success,
	error,
	notFound,
	validationError,
} from "@/shared/lib/actions"
import { prisma, notDeleted, softDelete } from "@/shared/lib/prisma"
import type { ActionState } from "@/shared/types/server-action"
import { updateTag } from "next/cache"

import { getTestimonialInvalidationTags } from "../constants/cache"
import { deleteTestimonialSchema } from "../schemas/testimonial.schemas"

export async function deleteTestimonial(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const adminCheck = await requireAdmin()
		if ("error" in adminCheck) return adminCheck.error

		// 2. Extraire les données du FormData
		const rawData = {
			id: formData.get("id"),
		}

		// 3. Valider les données
		const validation = deleteTestimonialSchema.safeParse(rawData)

		if (!validation.success) {
			const firstError = validation.error.issues?.[0]
			return validationError(firstError?.message || "Données invalides")
		}

		// 4. Vérifier que le témoignage existe
		const existing = await prisma.testimonial.findFirst({
			where: { id: validation.data.id, ...notDeleted },
		})

		if (!existing) {
			return notFound("Témoignage")
		}

		// 5. Soft delete du témoignage
		await softDelete.testimonial(validation.data.id)

		// 6. Invalider le cache
		const tags = getTestimonialInvalidationTags(validation.data.id)
		tags.forEach((tag) => updateTag(tag))

		return success("Témoignage supprimé avec succès")
	} catch (e) {
		console.error("[deleteTestimonial] Erreur:", e)
		return error("Une erreur est survenue lors de la suppression du témoignage")
	}
}
