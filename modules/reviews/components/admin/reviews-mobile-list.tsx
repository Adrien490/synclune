import { use } from "react";
import { ReviewStatus } from "@/app/generated/prisma/client";
import { MessageSquare, CircleCheck, EyeOff } from "lucide-react";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import { SelectableMobileCard } from "@/shared/components/selectable-mobile-card";
import { StopEventPropagation } from "@/shared/components/stop-event-propagation";
import { StopPropagationLink } from "@/shared/components/stop-propagation-link";
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
		<div className="space-y-4 pb-20 md:hidden md:pb-0">
			<ItemGroup aria-label="Avis clients" className="gap-2">
				{adminReviews.map((review) => (
					<div key={review.id} role="listitem">
						<SelectableMobileCard itemId={review.id} ariaLabel={`Avis sur ${review.product.title}`}>
							<Item variant="outline" size="sm" className="gap-3" aria-roledescription="carte avis">
								<ItemContent className="min-w-0">
									<ItemTitle>
										<StopPropagationLink
											href={`/creations/${review.product.slug}`}
											target="_blank"
											className="hover:text-primary truncate font-semibold transition-colors"
										>
											{review.product.title}
										</StopPropagationLink>
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
									<StopEventPropagation>
										<ReviewRowActions review={review} />
									</StopEventPropagation>
								</ItemActions>
							</Item>
						</SelectableMobileCard>
					</div>
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
