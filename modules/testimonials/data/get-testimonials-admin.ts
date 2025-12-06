import { prisma, notDeleted } from "@/shared/lib/prisma"
import { cacheTestimonialsAdmin } from "../constants/cache"
import {
	TESTIMONIALS_DEFAULT_PER_PAGE,
	TESTIMONIALS_MAX_PER_PAGE,
	TESTIMONIAL_ADMIN_SELECT,
} from "../constants/testimonial.constants"
import type {
	TestimonialListItem,
	TestimonialFilters,
	TestimonialListResult,
} from "../types/testimonial.types"

/**
 * Récupère les témoignages pour l'administration
 * Inclut les brouillons et les publiés
 * Supporte pagination, tri et filtres avancés
 */
export async function getTestimonialsAdmin(
	filters?: TestimonialFilters
): Promise<TestimonialListResult> {
	"use cache"
	cacheTestimonialsAdmin()

	// Pagination
	const page = Math.max(1, filters?.page ?? 1)
	const perPage = Math.min(
		TESTIMONIALS_MAX_PER_PAGE,
		Math.max(1, filters?.perPage ?? TESTIMONIALS_DEFAULT_PER_PAGE)
	)
	const skip = (page - 1) * perPage

	// Tri
	const sortBy = filters?.sortBy ?? "createdAt"
	const sortOrder = filters?.sortOrder ?? "desc"

	// Filtres
	const where = {
		...notDeleted,
		...(filters?.isPublished !== undefined && {
			isPublished: filters.isPublished,
		}),
		...(filters?.search && {
			OR: [
				{ authorName: { contains: filters.search, mode: "insensitive" as const } },
				{ content: { contains: filters.search, mode: "insensitive" as const } },
			],
		}),
		...(filters?.createdAfter && {
			createdAt: { gte: filters.createdAfter },
		}),
		...(filters?.createdBefore && {
			createdAt: {
				...(filters?.createdAfter && { gte: filters.createdAfter }),
				lte: filters.createdBefore,
			},
		}),
	}

	const [testimonials, total] = await Promise.all([
		prisma.testimonial.findMany({
			where,
			select: TESTIMONIAL_ADMIN_SELECT,
			orderBy: {
				[sortBy]: sortOrder,
			},
			skip,
			take: perPage,
		}),
		prisma.testimonial.count({ where }),
	])

	return {
		testimonials: testimonials as TestimonialListItem[],
		total,
		page,
		perPage,
		totalPages: Math.ceil(total / perPage),
	}
}
