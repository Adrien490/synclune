import type { Metadata } from "next";
import { Suspense } from "react";
import { Star } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty";
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
	const reviewsPromise = getUserReviews();
	const productsPromise = getReviewableProducts();

	return (
		<>
			<PageHeader title="Mes avis" variant="compact" />

			<div className="space-y-8">
				<Suspense fallback={<ReviewableProductsSkeleton />}>
					<ReviewableProductsWrapper productsPromise={productsPromise} />
				</Suspense>

				<Suspense fallback={<UserReviewsSkeleton />}>
					<UserReviewsWrapper reviewsPromise={reviewsPromise} />
				</Suspense>

				<Suspense>
					<ReviewsEmptyState reviewsPromise={reviewsPromise} productsPromise={productsPromise} />
				</Suspense>
			</div>

			<EditReviewDialog />
			<DeleteReviewAlertDialog />
		</>
	);
}

async function ReviewableProductsWrapper({
	productsPromise,
}: {
	productsPromise: ReturnType<typeof getReviewableProducts>;
}) {
	const products = await productsPromise;
	if (products.length === 0) return null;
	return <ReviewableProductsSection products={products} />;
}

async function UserReviewsWrapper({
	reviewsPromise,
}: {
	reviewsPromise: ReturnType<typeof getUserReviews>;
}) {
	const reviews = await reviewsPromise;
	if (reviews.length === 0) return null;
	return <UserReviewsSection reviews={reviews} />;
}

async function ReviewsEmptyState({
	reviewsPromise,
	productsPromise,
}: {
	reviewsPromise: ReturnType<typeof getUserReviews>;
	productsPromise: ReturnType<typeof getReviewableProducts>;
}) {
	const [reviews, products] = await Promise.all([reviewsPromise, productsPromise]);
	if (reviews.length > 0 || products.length > 0) return null;

	return (
		<Empty>
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<Star className="size-6" aria-hidden="true" />
				</EmptyMedia>
				<EmptyTitle>Aucun avis</EmptyTitle>
				<EmptyDescription>
					Vous n'avez pas encore de produits à évaluer. Commandez pour pouvoir laisser votre avis !
				</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button asChild size="lg">
					<Link href="/produits">Découvrir nos créations</Link>
				</Button>
			</EmptyContent>
		</Empty>
	);
}
