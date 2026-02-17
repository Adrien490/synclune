import { ReviewStatus } from "@/app/generated/prisma/client"
import { CursorPagination } from "@/shared/components/cursor-pagination"
import { TableScrollContainer } from "@/shared/components/table-scroll-container"
import { Card, CardContent } from "@/shared/components/ui/card"
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state"
import { Badge } from "@/shared/components/ui/badge"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table"
import { formatDateShort } from "@/shared/utils/dates"
import { CheckCircle2, EyeOff, MessageSquare } from "lucide-react"
import Link from "next/link"

import { RatingStars } from "@/shared/components/rating-stars"

import type { GetReviewsReturn, ReviewAdmin } from "../../types/review.types"
import { REVIEW_STATUS_LABELS } from "../../constants/review.constants"
import { ReviewRowActions } from "./review-row-actions"

export interface ReviewsDataTableProps {
	reviewsPromise: Promise<GetReviewsReturn>
	perPage?: number
}

export async function ReviewsDataTable({
	reviewsPromise,
	perPage = 20,
}: ReviewsDataTableProps) {
	const { reviews, pagination } = await reviewsPromise
	const adminReviews = reviews as ReviewAdmin[]

	if (reviews.length === 0) {
		return (
			<TableEmptyState
				icon={MessageSquare}
				title="Aucun avis trouvé"
				description="Aucun avis ne correspond aux critères de recherche."
			/>
		)
	}

	return (
		<Card>
			<CardContent>
				<TableScrollContainer>
					<Table aria-label="Liste des avis produits" striped>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[25%]">Produit</TableHead>
								<TableHead className="w-[20%]">Client</TableHead>
								<TableHead className="w-[10%]">Note</TableHead>
								<TableHead className="w-[15%]">Statut</TableHead>
								<TableHead className="hidden md:table-cell w-[15%]">Date</TableHead>
								<TableHead className="w-[10%]">Réponse</TableHead>
								<TableHead className="w-[5%] text-right" aria-label="Actions">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{adminReviews.map((review) => (
								<TableRow key={review.id}>
									{/* Produit */}
									<TableCell>
										<Link
											href={`/creations/${review.product.slug}`}
											target="_blank"
											className="font-medium hover:text-primary transition-colors line-clamp-1"
										>
											{review.product.title}
										</Link>
									</TableCell>

									{/* Client */}
									<TableCell>
										<div className="min-w-0">
											<p className="text-sm font-medium truncate">
												{review.user.name || "Anonyme"}
											</p>
											<p className="text-sm text-muted-foreground truncate">
												{review.user.email}
											</p>
										</div>
									</TableCell>

									{/* Note */}
									<TableCell>
										<RatingStars rating={review.rating} size="sm" />
									</TableCell>

									{/* Statut */}
									<TableCell>
										{review.status === ReviewStatus.PUBLISHED ? (
											<Badge variant="default" className="gap-1" role="status" aria-label={`Statut : ${REVIEW_STATUS_LABELS.PUBLISHED}`}>
												<CheckCircle2 className="size-3" aria-hidden="true" />
												{REVIEW_STATUS_LABELS.PUBLISHED}
											</Badge>
										) : (
											<Badge variant="secondary" className="gap-1" role="status" aria-label={`Statut : ${REVIEW_STATUS_LABELS.HIDDEN}`}>
												<EyeOff className="size-3" aria-hidden="true" />
												{REVIEW_STATUS_LABELS.HIDDEN}
											</Badge>
										)}
									</TableCell>

									{/* Date */}
									<TableCell className="hidden md:table-cell text-sm text-muted-foreground">
										<time dateTime={new Date(review.createdAt).toISOString()}>
											{formatDateShort(review.createdAt)}
										</time>
									</TableCell>

									{/* Réponse */}
									<TableCell>
										{review.response ? (
											<Badge variant="outline" className="text-xs">
												Répondu
											</Badge>
										) : (
											<span className="text-xs text-muted-foreground">-</span>
										)}
									</TableCell>

									{/* Actions */}
									<TableCell className="text-right">
										<ReviewRowActions review={review} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableScrollContainer>

				{(pagination.hasNextPage || pagination.hasPreviousPage) && (
					<div className="mt-4">
						<CursorPagination
							perPage={perPage}
							currentPageSize={adminReviews.length}
							nextCursor={pagination.nextCursor}
							prevCursor={pagination.prevCursor}
							hasNextPage={pagination.hasNextPage}
							hasPreviousPage={pagination.hasPreviousPage}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
