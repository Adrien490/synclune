import { ReviewStatus } from "@/app/generated/prisma/browser";
import { AdminDataTable, TableEmptyState } from "@/shared/components/data-table";
import { Badge } from "@/shared/components/ui/badge";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/components/ui/table";
import { formatDateShort } from "@/shared/utils/dates";
import { CircleCheck, EyeOff, MessageSquare } from "lucide-react";
import Link from "next/link";

import { RatingStars } from "@/shared/components/rating-stars";

import type { GetReviewsReturn, ReviewAdmin } from "../../types/review.types";
import {
	REVIEW_ANONYMOUS_AUTHOR_LABEL,
	REVIEW_STATUS_LABELS,
} from "../../constants/review.constants";
import { ReviewRowActions } from "./review-row-actions";

interface ReviewsDataTableProps {
	reviewsPromise: Promise<GetReviewsReturn>;
	perPage?: number;
	hasActiveFilters?: boolean;
}

export async function ReviewsDataTable({
	reviewsPromise,
	perPage = 20,
	hasActiveFilters,
}: ReviewsDataTableProps) {
	const { reviews, pagination, totalCount } = await reviewsPromise;
	const adminReviews = reviews as ReviewAdmin[];

	if (reviews.length === 0) {
		return (
			<TableEmptyState
				className="hidden md:flex"
				icon={MessageSquare}
				title="Aucun avis trouvé"
				description="Aucun avis ne correspond aux critères de recherche."
				noItemsDescription="Aucun avis client pour l'instant."
				hasActiveFilters={hasActiveFilters}
				resetFiltersHref="/admin/marketing/avis"
			/>
		);
	}

	return (
		<AdminDataTable
			caption="Liste des avis"
			pagination={{
				perPage,
				hasNextPage: pagination.hasNextPage,
				hasPreviousPage: pagination.hasPreviousPage,
				currentPageSize: reviews.length,
				nextCursor: pagination.nextCursor,
				prevCursor: pagination.prevCursor,
				totalCount,
			}}
		>
			<TableHeader>
				<TableRow>
					<TableHead className="w-[24%]">Produit</TableHead>
					<TableHead className="w-[18%]">Client</TableHead>
					<TableHead className="w-[10%]">Note</TableHead>
					<TableHead className="w-[12%]">Statut</TableHead>
					<TableHead className="w-[12%]">Date</TableHead>
					<TableHead className="w-[12%]">Réponse</TableHead>
					<TableHead className="w-[12%] text-right" aria-label="Actions">
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
								className="hover:text-primary line-clamp-1 font-medium transition-colors"
							>
								{review.product.title}
							</Link>
						</TableCell>

						{/* Client */}
						<TableCell>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">
									{review.user.name ?? REVIEW_ANONYMOUS_AUTHOR_LABEL}
								</p>
								<p className="text-muted-foreground truncate text-sm">{review.user.email}</p>
							</div>
						</TableCell>

						{/* Note */}
						<TableCell>
							<RatingStars rating={review.rating} size="sm" />
						</TableCell>

						{/* Statut */}
						<TableCell>
							{review.status === ReviewStatus.PUBLISHED ? (
								<Badge
									variant="default"
									className="gap-1"
									role="status"
									aria-label={`Statut : ${REVIEW_STATUS_LABELS.PUBLISHED}`}
								>
									<CircleCheck className="size-3" aria-hidden="true" />
									{REVIEW_STATUS_LABELS.PUBLISHED}
								</Badge>
							) : (
								<Badge
									variant="secondary"
									className="gap-1"
									role="status"
									aria-label={`Statut : ${REVIEW_STATUS_LABELS.HIDDEN}`}
								>
									<EyeOff className="size-3" aria-hidden="true" />
									{REVIEW_STATUS_LABELS.HIDDEN}
								</Badge>
							)}
						</TableCell>

						{/* Date */}
						<TableCell className="text-muted-foreground text-sm">
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
								<span className="text-muted-foreground text-xs">-</span>
							)}
						</TableCell>

						{/* Actions */}
						<TableCell className="text-right">
							<ReviewRowActions review={review} />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</AdminDataTable>
	);
}
