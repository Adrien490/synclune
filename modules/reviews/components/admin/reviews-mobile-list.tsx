import { use } from "react";
import { MessageSquare } from "lucide-react";
import { AdminListLiveCount } from "@/shared/components/admin-list-live-count";
import { CursorPagination } from "@/shared/components/cursor-pagination";
import { BulkSelectionProvider } from "@/shared/components/data-table";
import { EmptyResetFiltersAction } from "@/shared/components/data-table/empty-reset-filters-action";
import { TableEmptyState } from "@/shared/components/data-table/table-empty-state";
import {
	MobileSelectionBottomBar,
	MobileSelectionHeader,
} from "@/shared/components/mobile-selection";
import { ItemGroup } from "@/shared/components/ui/item";

import type { GetReviewsReturn, ReviewAdmin } from "../../types/review.types";
import { ReviewMobileItem } from "./review-mobile-item";
import { ReviewsBulkActionsBar } from "./reviews-bulk-actions-bar";

interface ReviewsMobileListProps {
	reviewsPromise: Promise<GetReviewsReturn>;
	perPage: number;
	hasActiveFilters?: boolean;
}

export function ReviewsMobileList({
	reviewsPromise,
	perPage,
	hasActiveFilters,
}: ReviewsMobileListProps) {
	const { reviews, pagination } = use(reviewsPromise);
	const adminReviews = reviews as ReviewAdmin[];

	if (adminReviews.length === 0) {
		return (
			<div className="md:hidden">
				<TableEmptyState
					icon={MessageSquare}
					title="Aucun avis trouve"
					description={
						hasActiveFilters
							? "Aucun avis ne correspond aux criteres de recherche."
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
			<div className="space-y-4 pb-[calc(var(--bottom-bar-height,5rem)+1rem)] md:hidden md:pb-0">
				<MobileSelectionHeader itemsLabel={{ singular: "avis", plural: "avis" }} />
				<AdminListLiveCount count={adminReviews.length} singular="avis" plural="avis" />
				<ItemGroup aria-label="Avis clients" className="gap-2">
					{adminReviews.map((review) => (
						<div key={review.id} role="listitem">
							<ReviewMobileItem review={review} />
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
			<MobileSelectionBottomBar>
				<ReviewsBulkActionsBar presentation="bottom-bar" />
			</MobileSelectionBottomBar>
		</BulkSelectionProvider>
	);
}
