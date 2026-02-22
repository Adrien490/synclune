import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/shared/components/page-header";
import { getUserReviews } from "@/modules/reviews/data/get-user-reviews";
import { getReviewableProducts } from "@/modules/reviews/data/get-reviewable-products";
import { ReviewsPageContent } from "@/modules/reviews/components/reviews-page-content";
import { ReviewsPageSkeleton } from "@/modules/reviews/components/reviews-page-skeleton";
import { EditReviewDialog } from "@/modules/reviews/components/edit-review-dialog";
import { DeleteReviewAlertDialog } from "@/modules/reviews/components/delete-review-alert-dialog";

export const metadata: Metadata = {
	title: "Mes avis",
};

export default function ReviewsPage() {
	const reviewsPromise = getUserReviews();
	const reviewableProductsPromise = getReviewableProducts();

	return (
		<>
			<PageHeader title="Mes avis" variant="compact" />

			<Suspense fallback={<ReviewsPageSkeleton />}>
				<ReviewsPageContent
					reviewsPromise={reviewsPromise}
					reviewableProductsPromise={reviewableProductsPromise}
				/>
			</Suspense>

			<EditReviewDialog />
			<DeleteReviewAlertDialog />
		</>
	);
}
