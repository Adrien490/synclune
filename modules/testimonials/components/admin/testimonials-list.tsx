"use client"

import { use } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	PaginationEllipsis,
} from "@/shared/components/ui/pagination"
import { useDialog } from "@/shared/providers/dialog-store-provider"
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider"
import { TESTIMONIAL_DIALOG_ID } from "./testimonial-form-dialog"
import { DELETE_TESTIMONIAL_DIALOG_ID } from "./delete-testimonial-alert-dialog"
import { toggleTestimonialPublish } from "@/modules/testimonials/actions/toggle-publish"
import type { TestimonialListResult } from "@/modules/testimonials/types/testimonial.types"
import { formatDateShort } from "@/shared/utils/dates"
import { useActionState, useCallback } from "react"
import { withCallbacks } from "@/shared/utils/with-callbacks"
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks"
import { Pencil, Trash2, Eye, EyeOff, Quote } from "lucide-react"

interface TestimonialsListProps {
	testimonialsPromise: Promise<TestimonialListResult>
}

export function TestimonialsList({
	testimonialsPromise,
}: TestimonialsListProps) {
	const { testimonials, total, page, perPage, totalPages } = use(testimonialsPromise)
	const { open: openEditDialog } = useDialog(TESTIMONIAL_DIALOG_ID)
	const { open: openDeleteDialog } = useAlertDialog(DELETE_TESTIMONIAL_DIALOG_ID)

	const router = useRouter()
	const pathname = usePathname()
	const searchParams = useSearchParams()

	const createPageUrl = useCallback(
		(pageNumber: number) => {
			const params = new URLSearchParams(searchParams.toString())
			params.set("page", pageNumber.toString())
			return `${pathname}?${params.toString()}`
		},
		[pathname, searchParams]
	)

	if (testimonials.length === 0 && page === 1) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<Quote className="h-12 w-12 mx-auto mb-4 opacity-50" />
				<p className="text-lg">Aucun témoignage</p>
				<p className="text-sm">
					Créez votre premier témoignage pour commencer.
				</p>
			</div>
		)
	}

	// Génère les numéros de page à afficher
	const getPageNumbers = () => {
		const pages: (number | "ellipsis")[] = []
		const showEllipsis = totalPages > 7

		if (!showEllipsis) {
			return Array.from({ length: totalPages }, (_, i) => i + 1)
		}

		// Toujours afficher la première page
		pages.push(1)

		if (page > 3) {
			pages.push("ellipsis")
		}

		// Pages autour de la page courante
		for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
			pages.push(i)
		}

		if (page < totalPages - 2) {
			pages.push("ellipsis")
		}

		// Toujours afficher la dernière page
		if (totalPages > 1) {
			pages.push(totalPages)
		}

		return pages
	}

	return (
		<div className="space-y-6">
			<p className="text-sm text-muted-foreground">
				{total} témoignage{total > 1 ? "s" : ""}
				{totalPages > 1 && ` • Page ${page} sur ${totalPages}`}
			</p>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{testimonials.map((testimonial) => (
					<TestimonialCard
						key={testimonial.id}
						testimonial={testimonial}
						onEdit={() =>
							openEditDialog({
								testimonial: {
									...testimonial,
								},
							})
						}
						onDelete={() =>
							openDeleteDialog({
								testimonialId: testimonial.id,
								authorName: testimonial.authorName,
							})
						}
					/>
				))}
			</div>

			{totalPages > 1 && (
				<Pagination>
					<PaginationContent>
						<PaginationItem>
							<PaginationPrevious
								href={page > 1 ? createPageUrl(page - 1) : undefined}
								aria-disabled={page <= 1}
								className={page <= 1 ? "pointer-events-none opacity-50" : ""}
							/>
						</PaginationItem>

						{getPageNumbers().map((pageNum, idx) =>
							pageNum === "ellipsis" ? (
								<PaginationItem key={`ellipsis-${idx}`}>
									<PaginationEllipsis />
								</PaginationItem>
							) : (
								<PaginationItem key={pageNum}>
									<PaginationLink
										href={createPageUrl(pageNum)}
										isActive={pageNum === page}
									>
										{pageNum}
									</PaginationLink>
								</PaginationItem>
							)
						)}

						<PaginationItem>
							<PaginationNext
								href={page < totalPages ? createPageUrl(page + 1) : undefined}
								aria-disabled={page >= totalPages}
								className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
							/>
						</PaginationItem>
					</PaginationContent>
				</Pagination>
			)}
		</div>
	)
}

interface TestimonialCardProps {
	testimonial: TestimonialListResult["testimonials"][number]
	onEdit: () => void
	onDelete: () => void
}

function TestimonialCard({
	testimonial,
	onEdit,
	onDelete,
}: TestimonialCardProps) {
	const [, toggleAction, isPending] = useActionState(
		withCallbacks(toggleTestimonialPublish, createToastCallbacks({})),
		undefined
	)

	return (
		<Card className="overflow-hidden">
			{testimonial.imageUrl && (
				<div className="aspect-video relative bg-muted">
					<img
						src={testimonial.imageUrl}
						alt={`Témoignage de ${testimonial.authorName}`}
						className="object-cover w-full h-full"
					/>
				</div>
			)}

			<CardContent className="p-4 space-y-3">
				<div className="flex items-start justify-between gap-2">
					<div>
						<p className="font-medium">{testimonial.authorName}</p>
						<p className="text-xs text-muted-foreground">
							{formatDateShort(testimonial.createdAt)}
						</p>
					</div>
					<Badge variant={testimonial.isPublished ? "default" : "secondary"}>
						{testimonial.isPublished ? "Publié" : "Brouillon"}
					</Badge>
				</div>

				<blockquote className="text-sm text-muted-foreground line-clamp-3 italic border-l-2 border-primary/20 pl-3">
					"{testimonial.content}"
				</blockquote>

				<div className="flex items-center gap-2 pt-2">
					<form action={toggleAction} className="flex-1">
						<input type="hidden" name="id" value={testimonial.id} />
						<input
							type="hidden"
							name="isPublished"
							value={testimonial.isPublished ? "false" : "true"}
						/>
						<Button
							type="submit"
							variant="outline"
							size="sm"
							className="w-full"
							disabled={isPending}
						>
							{testimonial.isPublished ? (
								<>
									<EyeOff className="h-4 w-4 mr-1" />
									Dépublier
								</>
							) : (
								<>
									<Eye className="h-4 w-4 mr-1" />
									Publier
								</>
							)}
						</Button>
					</form>

					<Button variant="outline" size="icon" onClick={onEdit}>
						<Pencil className="h-4 w-4" />
					</Button>

					<Button
						variant="outline"
						size="icon"
						onClick={onDelete}
						className="text-destructive hover:text-destructive"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
