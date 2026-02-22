"use client"

import { use } from "react"
import { Star } from "lucide-react"

import {
	Empty,
	EmptyActions,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/shared/components/ui/empty"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"

import type { ReviewUser, ReviewableProduct } from "../types/review.types"
import { UserReviewCard } from "./user-review-card"
import { ReviewableProductCard } from "./reviewable-product-card"

interface ReviewsPageContentProps {
	reviewsPromise: Promise<ReviewUser[]>
	reviewableProductsPromise: Promise<ReviewableProduct[]>
}

export function ReviewsPageContent({
	reviewsPromise,
	reviewableProductsPromise,
}: ReviewsPageContentProps) {
	const reviews = use(reviewsPromise)
	const reviewableProducts = use(reviewableProductsPromise)

	if (reviews.length === 0 && reviewableProducts.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<Star />
					</EmptyMedia>
					<EmptyTitle>Aucun avis</EmptyTitle>
					<EmptyDescription>
						Vous n'avez pas encore laissé d'avis.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyActions>
					<Button asChild>
						<Link href="/creations">Parcourir nos créations</Link>
					</Button>
				</EmptyActions>
			</Empty>
		)
	}

	return (
		<div className="space-y-8">
			{reviewableProducts.length > 0 && (
				<section aria-labelledby="reviewable-heading">
					<h2 id="reviewable-heading" className="text-lg/7 tracking-tight antialiased font-semibold mb-4">
						Produits à évaluer ({reviewableProducts.length})
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{reviewableProducts.map((product) => (
							<ReviewableProductCard
								key={product.productId}
								product={product}
							/>
						))}
					</div>
				</section>
			)}

			{reviews.length > 0 && (
				<section aria-labelledby="reviews-heading">
					<h2 id="reviews-heading" className="text-lg/7 tracking-tight antialiased font-semibold mb-4">
						Mes avis ({reviews.length})
					</h2>
					<div className="rounded-xl border border-border/60 overflow-hidden divide-y divide-border/50">
						{reviews.map((review) => (
							<UserReviewCard key={review.id} review={review} />
						))}
					</div>
				</section>
			)}
		</div>
	)
}
