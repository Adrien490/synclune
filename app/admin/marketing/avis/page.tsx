import { ReviewStatus } from "@/app/generated/prisma/client"
import { Toolbar } from "@/shared/components/toolbar"
import { PageHeader } from "@/shared/components/page-header"
import { SearchInput } from "@/shared/components/search-input"
import { SelectFilter } from "@/shared/components/select-filter"
import { MessageSquare, CheckCircle2, EyeOff, Star } from "lucide-react"
import { Suspense } from "react"
import type { Metadata } from "next"

import { getReviews, getReviewCountsByStatus } from "@/modules/reviews/data/get-reviews"
import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats"
import { ReviewsDataTable } from "@/modules/reviews/components/admin/reviews-data-table"
import { ReviewsDataTableSkeleton } from "@/modules/reviews/components/admin/reviews-data-table-skeleton"
import { REVIEW_STATUS_LABELS } from "@/modules/reviews/constants/review.constants"
import { RatingStars } from "@/shared/components/rating-stars"
import { formatRating } from "@/shared/utils/rating-utils"
import { getFirstParam } from "@/shared/utils/params"
import type { ReviewSortField } from "@/modules/reviews/types/review.types"

export const metadata: Metadata = {
	title: "Avis clients | Dashboard",
	description: "Gérez et modérez les avis clients sur vos produits",
}

interface ReviewsAdminPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ReviewsAdminPage({
	searchParams,
}: ReviewsAdminPageProps) {
	const params = await searchParams
	const [stats, globalStats] = await Promise.all([
		getReviewCountsByStatus(),
		getGlobalReviewStats(),
	])

	// Parsing des paramètres
	const perPage = parseInt(getFirstParam(params.perPage) || "20", 10)
	const cursor = getFirstParam(params.cursor)
	const search = getFirstParam(params.search)
	const statusFilter = getFirstParam(params.status) as ReviewStatus | undefined
	const ratingFilter = getFirstParam(params.rating)
		? parseInt(getFirstParam(params.rating) || "", 10)
		: undefined
	const sortByParam = getFirstParam(params.sortBy)
	const sortBy = (sortByParam || "createdAt-desc") as ReviewSortField

	const reviewsPromise = getReviews(
		{
			perPage,
			cursor,
			sortBy,
			search,
			status: statusFilter,
			filterRating: ratingFilter,
		},
		{ isAdmin: true }
	)

	// Options de tri
	const sortOptions = [
		{ value: "createdAt-desc", label: "Plus récents" },
		{ value: "createdAt-asc", label: "Plus anciens" },
		{ value: "rating-desc", label: "Meilleures notes" },
		{ value: "rating-asc", label: "Notes les plus basses" },
	]

	// Options de statut
	const statusOptions = [
		{ value: "", label: "Tous les statuts" },
		{ value: "PUBLISHED", label: REVIEW_STATUS_LABELS.PUBLISHED },
		{ value: "HIDDEN", label: REVIEW_STATUS_LABELS.HIDDEN },
	]

	// Options de note
	const ratingOptions = [
		{ value: "", label: "Toutes les notes" },
		{ value: "5", label: "5 étoiles" },
		{ value: "4", label: "4 étoiles" },
		{ value: "3", label: "3 étoiles" },
		{ value: "2", label: "2 étoiles" },
		{ value: "1", label: "1 étoile" },
	]

	return (
		<>
			<PageHeader variant="compact" title="Avis clients" />

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Total avis
							</p>
							<p className="text-2xl font-bold mt-1">{stats.total}</p>
						</div>
						<MessageSquare className="h-8 w-8 text-muted-foreground" />
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Publiés
							</p>
							<p className="text-2xl font-bold mt-1 text-secondary-foreground">
								{stats.published}
							</p>
						</div>
						<CheckCircle2 className="h-8 w-8 text-secondary-foreground" />
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Masqués
							</p>
							<p className="text-2xl font-bold mt-1 text-muted-foreground">
								{stats.hidden}
							</p>
						</div>
						<EyeOff className="h-8 w-8 text-muted-foreground" />
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Note moyenne
							</p>
							<p className="text-2xl font-bold mt-1">
								{globalStats.totalReviews > 0 ? formatRating(globalStats.averageRating) : "-"}
							</p>
							{globalStats.totalReviews > 0 && (
								<RatingStars rating={globalStats.averageRating} size="sm" />
							)}
						</div>
						<Star className="h-8 w-8 text-muted-foreground" />
					</div>
				</div>
			</div>

			{/* Toolbar */}
			<Toolbar
				ariaLabel="Barre d'outils de gestion des avis"
				search={
					<SearchInput
						mode="live"
						size="sm"
						paramName="search"
						placeholder="Rechercher par client, produit..."
						ariaLabel="Rechercher un avis"
						className="w-full"
					/>
				}
			>
				<SelectFilter
					filterKey="status"
					label="Statut"
					options={statusOptions}
					placeholder="Tous les statuts"
					className="w-full sm:min-w-[150px]"
					noPrefix
				/>
				<SelectFilter
					filterKey="rating"
					label="Note"
					options={ratingOptions}
					placeholder="Toutes les notes"
					className="w-full sm:min-w-[150px]"
					noPrefix
				/>
				<SelectFilter
					filterKey="sortBy"
					label="Trier par"
					options={sortOptions}
					placeholder="Plus récents"
					className="w-full sm:min-w-45"
					noPrefix
				/>
			</Toolbar>

			{/* DataTable */}
			<Suspense fallback={<ReviewsDataTableSkeleton />}>
				<ReviewsDataTable reviewsPromise={reviewsPromise} perPage={perPage} />
			</Suspense>
		</>
	)
}
