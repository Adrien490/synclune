import { use } from "react";
import { MessageSquare } from "lucide-react";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import type {} from "@/app/generated/prisma/browser";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetReviewsReturn, ReviewAdmin } from "../../types/review.types";
import { ReviewMobileItem } from "./review-mobile-item";
import { ADMIN_LIST_PENDING_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";

interface ReviewsMobileListProps {
	reviewsPromise: Promise<GetReviewsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	/** Snapshot des filtres courants pour la sélection cross-page. */
}

export function ReviewsMobileList({
	reviewsPromise,
	perPage,
	hasActiveFilters,
}: ReviewsMobileListProps) {
	const { reviews, pagination, totalCount } = use(reviewsPromise);
	const adminReviews = reviews as ReviewAdmin[];

	if (adminReviews.length === 0) {
		return (
			<div className={cn(ADMIN_LIST_PENDING_CLASS, "md:hidden")}>
				<TableEmptyState
					icon={MessageSquare}
					title="Aucun avis trouvé"
					description={
						hasActiveFilters
							? "Aucun avis ne correspond aux critères de recherche."
							: "Aucun avis pour l'instant."
					}
					actionElement={
						hasActiveFilters ? <EmptyResetFiltersAction href="/admin/marketing/avis" /> : undefined
					}
				/>
			</div>
		);
	}

	return (
		<div
			className={cn(
				ADMIN_LIST_PENDING_CLASS,
				"space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,56px)+1rem)] md:hidden md:pb-0",
			)}
		>
			<AdminListLiveCount
				count={adminReviews.length}
				singular="avis"
				plural="avis"
				totalCount={totalCount}
			/>
			<ItemGroup aria-label="Avis clients" className="gap-2">
				{adminReviews.map((review) => (
					<li key={review.id}>
						<ReviewMobileItem review={review} />
					</li>
				))}
			</ItemGroup>

			{(pagination.hasNextPage || pagination.hasPreviousPage) && (
				<AdminMobileListPagination
					perPage={perPage}
					hasNextPage={pagination.hasNextPage}
					hasPreviousPage={pagination.hasPreviousPage}
					currentPageSize={adminReviews.length}
					nextCursor={pagination.nextCursor}
					prevCursor={pagination.prevCursor}
					totalCount={totalCount}
				/>
			)}
		</div>
	);
}
