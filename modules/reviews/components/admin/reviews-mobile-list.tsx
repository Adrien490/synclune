import { use } from "react";
import { ReviewStatus } from "@/app/generated/prisma/client";
import { MessageSquare, CircleCheck, EyeOff } from "lucide-react";
import Link from "next/link";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/shared/components/ui/item";
import { Badge } from "@/shared/components/ui/badge";
import { RatingStars } from "@/shared/components/rating-stars";
import { formatDateShort } from "@/shared/utils/dates";
import type { GetReviewsReturn, ReviewAdmin } from "../../types/review.types";
import { REVIEW_STATUS_LABELS } from "../../constants/review.constants";
import { ReviewRowActions } from "./review-row-actions";

interface ReviewsMobileListProps {
	reviewsPromise: Promise<GetReviewsReturn>;
	perPage: number;
}

export function ReviewsMobileList({ reviewsPromise, perPage }: ReviewsMobileListProps) {
	const { reviews, pagination } = use(reviewsPromise);
	const adminReviews = reviews as ReviewAdmin[];

	if (adminReviews.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={MessageSquare}
					title="Aucun avis trouve"
					description="Aucun avis ne correspond aux criteres de recherche."
					action={{ label: "Reinitialiser les filtres", href: "/admin/marketing/avis" }}
				/>
			</div>
		);
	}

	return (
		<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
			<AdminListLiveCount count={adminReviews.length} singular="avis" plural="avis" />
			<ItemGroup aria-label="Avis clients" className="gap-2">
				{adminReviews.map((review) => (
					<Item
						key={review.id}
						variant="outline"
						size="sm"
						className="gap-3"
						aria-roledescription="carte avis"
						role="listitem"
					>
						<ItemContent className="min-w-0">
							<ItemTitle>
								<Link
									href={`/creations/${review.product.slug}`}
									target="_blank"
									className="hover:text-primary truncate font-semibold transition-colors"
								>
									{review.product.title}
								</Link>
								{review.status === ReviewStatus.PUBLISHED ? (
									<Badge variant="default" className="gap-1">
										<CircleCheck className="size-3" aria-hidden="true" />
										{REVIEW_STATUS_LABELS.PUBLISHED}
									</Badge>
								) : (
									<Badge variant="secondary" className="gap-1">
										<EyeOff className="size-3" aria-hidden="true" />
										{REVIEW_STATUS_LABELS.HIDDEN}
									</Badge>
								)}
							</ItemTitle>
							<ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
								<span>{review.user.name ?? "Anonyme"}</span>
								<span aria-hidden="true">·</span>
								<RatingStars rating={review.rating} size="sm" />
								{review.response && (
									<>
										<span aria-hidden="true">·</span>
										<Badge variant="outline" className="text-xs">
											Repondu
										</Badge>
									</>
								)}
								<span aria-hidden="true">·</span>
								<span>{formatDateShort(review.createdAt)}</span>
							</ItemDescription>
						</ItemContent>
						<ItemActions>
							<ReviewRowActions review={review} />
						</ItemActions>
					</Item>
				))}
			</ItemGroup>

			{(pagination.hasNextPage || pagination.hasPreviousPage) && (
				<CursorPagination
					perPage={perPage}
					hasNextPage={pagination.hasNextPage}
					hasPreviousPage={pagination.hasPreviousPage}
					currentPageSize={adminReviews.length}
					nextCursor={pagination.nextCursor}
					prevCursor={pagination.prevCursor}
				/>
			)}
		</div>
	);
}
