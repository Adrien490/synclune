import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/shared/components/page-header";
import { getUserReviews } from "@/modules/reviews/data/get-user-reviews";
import { getReviewableProducts } from "@/modules/reviews/data/get-reviewable-products";
import { ReviewableProductsSection } from "@/modules/reviews/components/reviewable-products-section";
import { UserReviewsSection } from "@/modules/reviews/components/user-reviews-section";
import {
	ReviewableProductsSkeleton,
	UserReviewsSkeleton,
} from "@/modules/reviews/components/reviews-page-skeleton";
import { EditReviewDialog } from "@/modules/reviews/components/edit-review-dialog";
import { DeleteReviewAlertDialog } from "@/modules/reviews/components/delete-review-alert-dialog";

export const metadata: Metadata = {
	title: "Mes avis",
};

export default function ReviewsPage() {
	return (
		<>
			<PageHeader title="Mes avis" variant="compact" />

			<div className="space-y-8">
				<Suspense fallback={<ReviewableProductsSkeleton />}>
					<ReviewableProductsWrapper />
				</Suspense>

				<Suspense fallback={<UserReviewsSkeleton />}>
					<UserReviewsWrapper />
				</Suspense>
			</div>

			<EditReviewDialog />
			<DeleteReviewAlertDialog />
		</>
	);
}

async function ReviewableProductsWrapper() {
	const products = await getReviewableProducts();
	if (products.length === 0) return null;
	return <ReviewableProductsSection products={products} />;
}

async function UserReviewsWrapper() {
	const reviews = await getUserReviews();
	if (reviews.length === 0) return null;
	return <UserReviewsSection reviews={reviews} />;
}
