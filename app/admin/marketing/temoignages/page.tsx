import { PageHeader } from "@/shared/components/page-header"
import { getTestimonialsAdmin } from "@/modules/testimonials/data/get-testimonials-admin"
import { connection } from "next/server"
import { Suspense } from "react"
import { TestimonialsList } from "@/modules/testimonials/components/admin/testimonials-list"
import { TestimonialsListSkeleton } from "@/modules/testimonials/components/admin/testimonials-list-skeleton"
import { CreateTestimonialButton } from "@/modules/testimonials/components/admin/create-testimonial-button"
import { TestimonialFormDialog } from "@/modules/testimonials/components/admin/testimonial-form-dialog"
import { DeleteTestimonialAlertDialog } from "@/modules/testimonials/components/admin/delete-testimonial-alert-dialog"
import type { TestimonialFilters, TestimonialSortBy, TestimonialSortOrder } from "@/modules/testimonials/types/testimonial.types"
import { Metadata } from "next"

export const metadata: Metadata = {
	title: "Témoignages - Administration",
	description: "Gérer les témoignages clients",
}

interface PageProps {
	searchParams: Promise<{
		page?: string
		perPage?: string
		search?: string
		isPublished?: string
		sortBy?: string
		sortOrder?: string
	}>
}

export default async function TestimonialsAdminPage({ searchParams }: PageProps) {
	// Force dynamic rendering
	await connection()

	const params = await searchParams

	// Parse les paramètres de pagination et filtres
	const filters: TestimonialFilters = {
		page: params.page ? Math.max(1, parseInt(params.page, 10)) : 1,
		perPage: params.perPage ? Math.min(100, Math.max(1, parseInt(params.perPage, 10))) : 20,
		search: params.search || undefined,
		isPublished: params.isPublished === "true" ? true : params.isPublished === "false" ? false : undefined,
		sortBy: (params.sortBy as TestimonialSortBy) || "createdAt",
		sortOrder: (params.sortOrder as TestimonialSortOrder) || "desc",
	}

	// La promise n'est PAS awaitée pour permettre le streaming
	const testimonialsPromise = getTestimonialsAdmin(filters)

	return (
		<>
			<PageHeader
				variant="compact"
				title="Témoignages"
				actions={<CreateTestimonialButton />}
			/>

			<div className="space-y-6">
				<Suspense fallback={<TestimonialsListSkeleton />}>
					<TestimonialsList testimonialsPromise={testimonialsPromise} />
				</Suspense>
			</div>

			<TestimonialFormDialog />
			<DeleteTestimonialAlertDialog />
		</>
	)
}
