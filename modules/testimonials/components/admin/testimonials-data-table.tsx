"use client"

import { use, useCallback } from "react"
import { useSearchParams, usePathname } from "next/navigation"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table"
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
	PaginationEllipsis,
} from "@/shared/components/ui/pagination"
import { TableScrollContainer } from "@/shared/components/table-scroll-container"
import { SelectionProvider } from "@/shared/contexts/selection-context"
import { TestimonialsSelectionToolbar } from "./testimonials-selection-toolbar"
import { TestimonialsTableSelectionCell } from "./testimonials-table-selection-cell"
import { TestimonialRowActions } from "./testimonial-row-actions"
import { formatDateShort } from "@/shared/utils/dates"
import { Quote, ImageOff } from "lucide-react"
import type { TestimonialListResult } from "../../types/testimonial.types"

interface TestimonialsDataTableProps {
	testimonialsPromise: Promise<TestimonialListResult>
}

export function TestimonialsDataTable({
	testimonialsPromise,
}: TestimonialsDataTableProps) {
	const { testimonials, total, page, totalPages } = use(testimonialsPromise)
	const testimonialIds = testimonials.map((t) => t.id)

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
		for (
			let i = Math.max(2, page - 1);
			i <= Math.min(totalPages - 1, page + 1);
			i++
		) {
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

	if (testimonials.length === 0 && page === 1) {
		return (
			<Empty className="py-12">
				<EmptyHeader>
					<EmptyMedia variant="icon">
						<Quote />
					</EmptyMedia>
					<EmptyTitle>Aucun témoignage</EmptyTitle>
					<EmptyDescription>
						Créez votre premier témoignage pour commencer.
					</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<SelectionProvider selectionKey="testimonials">
			<Card>
				<CardContent>
					<TestimonialsSelectionToolbar />

					<p className="text-sm text-muted-foreground mb-4">
						{total} témoignage{total > 1 ? "s" : ""}
						{totalPages > 1 && ` • Page ${page} sur ${totalPages}`}
					</p>

					<TableScrollContainer>
						<Table
							role="table"
							aria-label="Liste des témoignages"
							className="min-w-full table-fixed"
						>
							<TableHeader>
								<TableRow>
									<TableHead
										scope="col"
										role="columnheader"
										className="w-[5%]"
									>
										<TestimonialsTableSelectionCell
											type="header"
											testimonialIds={testimonialIds}
										/>
									</TableHead>
									<TableHead
										scope="col"
										role="columnheader"
										className="w-[10%]"
									>
										Image
									</TableHead>
									<TableHead
										scope="col"
										role="columnheader"
										className="w-[20%]"
									>
										Auteur
									</TableHead>
									<TableHead
										scope="col"
										role="columnheader"
										className="hidden sm:table-cell w-[40%]"
									>
										Contenu
									</TableHead>
									<TableHead
										scope="col"
										role="columnheader"
										className="w-[15%]"
									>
										Statut
									</TableHead>
									<TableHead
										scope="col"
										role="columnheader"
										className="w-[10%] text-right"
										aria-label="Actions disponibles pour chaque témoignage"
									>
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{testimonials.map((testimonial) => (
									<TableRow key={testimonial.id}>
										<TableCell role="gridcell">
											<TestimonialsTableSelectionCell
												type="row"
												testimonialId={testimonial.id}
											/>
										</TableCell>
										<TableCell role="gridcell">
											{testimonial.imageUrl ? (
												<img
													src={testimonial.imageUrl}
													alt={`Témoignage de ${testimonial.authorName}`}
													className="h-10 w-10 rounded object-cover"
												/>
											) : (
												<div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
													<ImageOff className="h-4 w-4 text-muted-foreground" />
												</div>
											)}
										</TableCell>
										<TableCell role="gridcell">
											<div>
												<p className="font-medium truncate">
													{testimonial.authorName}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatDateShort(testimonial.createdAt)}
												</p>
											</div>
										</TableCell>
										<TableCell
											role="gridcell"
											className="hidden sm:table-cell"
										>
											<p className="text-sm text-muted-foreground line-clamp-2 italic">
												"{testimonial.content}"
											</p>
										</TableCell>
										<TableCell role="gridcell">
											<Badge
												variant={
													testimonial.isPublished ? "default" : "secondary"
												}
											>
												{testimonial.isPublished ? "Publié" : "Brouillon"}
											</Badge>
										</TableCell>
										<TableCell role="gridcell" className="text-right">
											<TestimonialRowActions
												testimonial={{
													id: testimonial.id,
													authorName: testimonial.authorName,
													content: testimonial.content,
													imageUrl: testimonial.imageUrl,
													isPublished: testimonial.isPublished,
												}}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableScrollContainer>

					{totalPages > 1 && (
						<div className="mt-4">
							<Pagination>
								<PaginationContent>
									<PaginationItem>
										<PaginationPrevious
											href={page > 1 ? createPageUrl(page - 1) : undefined}
											aria-disabled={page <= 1}
											className={
												page <= 1 ? "pointer-events-none opacity-50" : ""
											}
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
											href={
												page < totalPages
													? createPageUrl(page + 1)
													: undefined
											}
											aria-disabled={page >= totalPages}
											className={
												page >= totalPages
													? "pointer-events-none opacity-50"
													: ""
											}
										/>
									</PaginationItem>
								</PaginationContent>
							</Pagination>
						</div>
					)}
				</CardContent>
			</Card>
		</SelectionProvider>
	)
}
