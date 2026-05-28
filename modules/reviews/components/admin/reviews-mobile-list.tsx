import { use } from "react";
import { MessageSquare } from "lucide-react";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { AdminMobileListPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import type { ReviewStatus } from "@/app/generated/prisma/browser";
import { ItemGroup } from "@/shared/components/ui/item";
import { AdminListPendingProvider } from "@/shared/contexts/admin-list-pending-context";

import type { GetReviewsReturn, ReviewAdmin, ReviewSortField } from "../../types/review.types";
import { ReviewMobileItem } from "./review-mobile-item";
import { ReviewsBulkActionsBar } from "./reviews-bulk-actions-bar";
import { ReviewsCrossPageBanner } from "./reviews-cross-page-banner";

interface ReviewsMobileListProps {
	reviewsPromise: Promise<GetReviewsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
	/** Snapshot des filtres courants pour la sélection cross-page. */
	filterParams?: {
		search?: string;
		sortBy?: ReviewSortField;
		status?: ReviewStatus;
		filterRating?: number;
		hasResponse?: boolean;
	};
}

export function ReviewsMobileList({
	reviewsPromise,
	perPage,
	hasActiveFilters,
	filterParams,
}: ReviewsMobileListProps) {
	const { reviews, pagination, totalCount } = use(reviewsPromise);
	const adminReviews = reviews as ReviewAdmin[];

	if (adminReviews.length === 0) {
		return (
			<div className="md:hidden">
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

	const pageItemIds = adminReviews.map((r) => r.id);

	return (
		<BulkSelectionProvider pageItemIds={pageItemIds}>
			<AdminListPendingProvider itemsLabel={{ singular: "avis", plural: "avis" }}>
				<div className="space-y-4 overscroll-contain pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
					<MobileSelectionHeader itemsLabel={{ singular: "avis", plural: "avis" }} />
					{filterParams ? (
						<ReviewsCrossPageBanner totalCount={totalCount} filterParams={filterParams} />
					) : null}
					<AdminListLiveCount count={adminReviews.length} singular="avis" plural="avis" />
					<ItemGroup aria-label="Avis clients" className="gap-2">
						{adminReviews.map((review) => (
							<div key={review.id} role="listitem">
								<ReviewMobileItem review={review} />
							</div>
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
				<MobileSelectionBottomBar emptyHint="Tape sur les retours à modérer">
					<ReviewsBulkActionsBar presentation="bottom-bar" />
				</MobileSelectionBottomBar>
			</AdminListPendingProvider>
		</BulkSelectionProvider>
	);
}
