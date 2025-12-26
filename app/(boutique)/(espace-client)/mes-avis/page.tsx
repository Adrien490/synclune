import { Suspense } from "react"
import { MessageSquare, Star } from "lucide-react"
import type { Metadata } from "next"

import { PageHeader } from "@/shared/components/page-header"
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Separator } from "@/shared/components/ui/separator"

import { getUserReviews } from "@/modules/reviews/data/get-user-reviews"
import { getReviewableProducts } from "@/modules/reviews/data/get-reviewable-products"
import { UserReviewCard } from "@/modules/reviews/components/user-review-card"
import { ReviewableProductCard } from "@/modules/reviews/components/reviewable-product-card"
import { DeleteReviewAlertDialog } from "@/modules/reviews/components/delete-review-alert-dialog"
import { EditReviewDialog } from "@/modules/reviews/components/edit-review-dialog"

export const metadata: Metadata = {
	title: "Mes avis - Synclune",
	description: "Consultez et gérez vos avis sur les produits Synclune.",
	robots: {
		index: false,
		follow: true,
	},
}

async function UserReviewsList() {
	const reviews = await getUserReviews()

	if (reviews.length === 0) {
		return (
			<div className="text-center py-8">
				<MessageSquare className="size-12 text-muted-foreground/50 mx-auto mb-3" />
				<p className="text-muted-foreground">
					Vous n&apos;avez pas encore laissé d&apos;avis.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{reviews.map((review) => (
				<UserReviewCard key={review.id} review={review} />
			))}
		</div>
	)
}

async function ReviewableProductsList() {
	const products = await getReviewableProducts()

	if (products.length === 0) {
		return (
			<div className="text-center py-8">
				<Star className="size-12 text-muted-foreground/50 mx-auto mb-3" />
				<p className="text-muted-foreground">
					Aucun produit en attente d&apos;avis.
				</p>
				<p className="text-sm text-muted-foreground mt-1">
					Vos prochaines commandes livrées apparaîtront ici.
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{products.map((product) => (
				<ReviewableProductCard key={product.orderItemId} product={product} />
			))}
		</div>
	)
}

function ReviewsListSkeleton() {
	return (
		<div className="space-y-4">
			{Array.from({ length: 3 }).map((_, i) => (
				<Card key={i}>
					<CardContent className="p-0">
						<div className="flex flex-col sm:flex-row">
							<Skeleton className="w-full sm:w-32 h-32" />
							<div className="flex-1 p-4 space-y-3">
								<div className="flex justify-between">
									<Skeleton className="h-5 w-40" />
									<Skeleton className="h-5 w-16" />
								</div>
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-16 w-full" />
								<div className="flex gap-2">
									<Skeleton className="h-8 w-24" />
									<Skeleton className="h-8 w-24" />
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}

export default function MyReviewsPage() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes avis"
				description="Gérez vos avis et partagez votre expérience"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Mes avis", href: "/mes-avis" },
				]}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
					{/* Produits à évaluer */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<Star className="size-5 text-primary" />
								Produits à évaluer
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Suspense fallback={<ReviewsListSkeleton />}>
								<ReviewableProductsList />
							</Suspense>
						</CardContent>
					</Card>

					<Separator />

					{/* Mes avis */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<MessageSquare className="size-5 text-primary" />
								Mes avis publiés
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Suspense fallback={<ReviewsListSkeleton />}>
								<UserReviewsList />
							</Suspense>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* Dialogs (une seule instance chacun) */}
			<DeleteReviewAlertDialog />
			<EditReviewDialog />
		</div>
	)
}
