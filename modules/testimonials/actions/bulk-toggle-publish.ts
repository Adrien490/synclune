"use server"

import { z } from "zod"
import {
	requireAdmin,
	success,
	error,
	validationError,
} from "@/shared/lib/actions"
import { prisma, notDeleted } from "@/shared/lib/prisma"
import type { ActionState } from "@/shared/types/server-action"
import { updateTag } from "next/cache"

import { TESTIMONIALS_CACHE_TAGS } from "../constants/cache"

const bulkTogglePublishSchema = z.object({
	ids: z
		.array(z.cuid("ID de témoignage invalide"))
		.min(1, "Sélectionnez au moins un témoignage")
		.max(100, "Maximum 100 témoignages à la fois"),
	isPublished: z.boolean(),
})

export async function bulkTogglePublish(
	_prevState: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	try {
		// 1. Vérification des droits admin
		const adminCheck = await requireAdmin()
		if ("error" in adminCheck) return adminCheck.error

		// 2. Extraire et valider les données
		const idsString = formData.get("ids") as string
		const isPublished = formData.get("isPublished") === "true"

		let ids: string[]

		try {
			ids = JSON.parse(idsString)
		} catch {
			return validationError("Format des IDs invalide")
		}

		const validation = bulkTogglePublishSchema.safeParse({ ids, isPublished })

		if (!validation.success) {
			const firstError = validation.error.issues?.[0]
			return validationError(firstError?.message || "Données invalides")
		}

		// 3. Vérifier que les témoignages existent
		const existing = await prisma.testimonial.findMany({
			where: {
				id: { in: validation.data.ids },
				...notDeleted,
			},
			select: { id: true },
		})

		if (existing.length === 0) {
			return error("Aucun témoignage trouvé à modifier")
		}

		const existingIds = existing.map((t) => t.id)

		// 4. Mise à jour en masse
		await prisma.testimonial.updateMany({
			where: {
				id: { in: existingIds },
			},
			data: {
				isPublished: validation.data.isPublished,
			},
		})

		// 5. Invalider le cache
		const tags = new Set<string>([
			TESTIMONIALS_CACHE_TAGS.LIST,
			TESTIMONIALS_CACHE_TAGS.ADMIN_LIST,
		])

		existingIds.forEach((id) => {
			tags.add(TESTIMONIALS_CACHE_TAGS.DETAIL(id))
		})

		tags.forEach((tag) => updateTag(tag))

		const count = existingIds.length
		const statusText = validation.data.isPublished ? "publié" : "dépublié"
		return success(
			`${count} témoignage${count > 1 ? "s" : ""} ${statusText}${count > 1 ? "s" : ""} avec succès`
		)
	} catch (e) {
		console.error("[bulkTogglePublish] Erreur:", e)
		return error("Une erreur est survenue lors de la modification")
	}
}
