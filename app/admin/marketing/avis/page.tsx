import { type ReviewStatus } from "@/app/generated/prisma/client";
import { Toolbar } from "@/shared/components/toolbar";
import { ButtonGroup } from "@/shared/components/ui/button-group";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { MessageSquare, CircleCheck, EyeOff, Star } from "lucide-react";
import { Suspense } from "react";
import type { Metadata } from "next";

import { getReviews, getReviewCountsByStatus } from "@/modules/reviews/data/get-reviews";
import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats";
import dynamic from "next/dynamic";

import { ReviewsAdminDialogs } from "./_components/reviews-admin-dialogs";
import { ReviewsDataTable } from "@/modules/reviews/components/admin/reviews-data-table";
import { ReviewsDataTableSkeleton } from "@/modules/reviews/components/admin/reviews-data-table-skeleton";
import { ReviewsFilterBadges } from "@/modules/reviews/components/admin/reviews-filter-badges";
import { ReviewsFilterSheet } from "@/modules/reviews/components/admin/reviews-filter-sheet";
import { RefreshReviewsButton } from "@/modules/reviews/components/admin/refresh-reviews-button";
import { ReviewsMobileList } from "@/modules/reviews/components/admin/reviews-mobile-list";
import { ReviewsMobileListSkeleton } from "@/modules/reviews/components/admin/reviews-mobile-list-skeleton";
import { ReviewsSortBadge } from "@/modules/reviews/components/admin/reviews-sort-badge";

const ReviewsBottomBar = dynamic(() =>
	import("@/modules/reviews/components/admin/reviews-bottom-bar").then(
		(mod) => mod.ReviewsBottomBar,
	),
);
import { RatingStars } from "@/shared/components/rating-stars";
import { formatRating } from "@/shared/utils/rating-utils";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { getFirstParam } from "@/shared/utils/params";
import type { ReviewSortField } from "@/modules/reviews/types/review.types";
import { ResultCountLiveRegion } from "@/shared/components/result-count-live-region";
import { ADMIN_LIST_GROUP_CLASS } from "@/shared/components/admin-list-pending.styles";
import { cn } from "@/shared/utils/cn";

export const metadata: Metadata = {
	title: "Avis clients | Dashboard",
	description: "Gérez et modérez les avis clients sur vos produits",
};

interface ReviewsAdminPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReviewsAdminPage({ searchParams }: ReviewsAdminPageProps) {
	const [params, stats, globalStats] = await Promise.all([
		searchParams,
		getReviewCountsByStatus(),
		getGlobalReviewStats(),
	]);

	// Parsing des paramètres
	const perPage = parseInt(getFirstParam(params.perPage) ?? "20", 10);
	const cursor = getFirstParam(params.cursor);
	const search = getFirstParam(params.search);
	// Clés préfixées `filter_` comme les 10 autres listes admin : c'est ce que
	// comptent `useActiveListControls()` (badge mobile) et `useFilter` (badges de
	// filtres actifs).
	const statusFilter = getFirstParam(params.filter_status) as ReviewStatus | undefined;
	const ratingFilter = getFirstParam(params.filter_rating)
		? parseInt(getFirstParam(params.filter_rating) ?? "", 10)
		: undefined;
	const sortByParam = getFirstParam(params.sortBy);
	const sortBy = (sortByParam ?? "createdAt-desc") as ReviewSortField;
	const hasResponseParam = getFirstParam(params.filter_hasResponse);
	const hasResponse =
		hasResponseParam === "true" ? true : hasResponseParam === "false" ? false : undefined;

	const hasActiveFilters = !!search || Object.keys(params).some((key) => key.startsWith("filter_"));

	const reviewsPromise = getReviews(
		{
			perPage,
			cursor,
			sortBy,
			search,
			status: statusFilter,
			filterRating: ratingFilter,
			hasResponse,
		},
		{ isAdmin: true },
	);

	// Options de tri
	const sortOptions = [
		{ value: "createdAt-desc", label: "Plus récents" },
		{ value: "createdAt-asc", label: "Plus anciens" },
		{ value: "rating-desc", label: "Meilleures notes" },
		{ value: "rating-asc", label: "Notes les plus basses" },
	];

	// Statut / note / réponse vivent désormais dans `ReviewsFilterSheet`, partagé
	// entre desktop et mobile — un seul jeu de filtres, une seule définition.

	return (
		// `display: contents` : cette page rend un fragment, il n'y a donc aucun
		// conteneur où poser le groupe. Un wrapper `contents` est un ancêtre DOM
		// (donc visible par le `:has()` de `group-has-*`) sans générer de boîte —
		// l'espacement hérité du layout admin reste strictement identique.
		<div className={cn(ADMIN_LIST_GROUP_CLASS, "contents")}>
			<PageHeader variant="compact" title="Avis clients" className="hidden md:block" />

			<Suspense fallback={null}>
				<ResultCountLiveRegion
					totalCount={reviewsPromise.then((d) => d.totalCount)}
					query={search}
					singular="avis"
					plural="avis"
				/>
			</Suspense>

			<ReviewsBottomBar />

			{/* Statistiques */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Total avis</p>
							<p className="mt-1 text-2xl font-bold">{stats.total}</p>
						</div>
						<MessageSquare className="text-muted-foreground size-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Publiés</p>
							<p className="text-secondary-foreground mt-1 text-2xl font-bold">{stats.published}</p>
						</div>
						<CircleCheck className="text-secondary-foreground size-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Masqués</p>
							<p className="text-muted-foreground mt-1 text-2xl font-bold">{stats.hidden}</p>
						</div>
						<EyeOff className="text-muted-foreground size-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Note moyenne</p>
							<p className="mt-1 text-2xl font-bold">
								{globalStats.totalReviews > 0 ? formatRating(globalStats.averageRating) : "-"}
							</p>
							{globalStats.totalReviews > 0 && (
								<RatingStars rating={globalStats.averageRating} size="sm" />
							)}
						</div>
						<Star className="text-muted-foreground size-8" />
					</div>
				</div>
			</div>

			{/* Toolbar */}
			<Suspense
				fallback={<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />}
			>
				<Toolbar
					className="hidden md:flex"
					ariaLabel="Barre d'outils de gestion des avis"
					search={
						<SearchInput
							size="sm"
							paramName="search"
							placeholder="Rechercher par client, produit…"
							aria-label="Rechercher un avis"
							className="w-full"
						/>
					}
				>
					<SelectFilter
						filterKey="sortBy"
						label="Trier par"
						options={sortOptions}
						placeholder="Plus récents"
						className="w-full sm:min-w-45"
						noPrefix
					/>
					<ButtonGroup aria-label="Filtres et actions">
						<ReviewsFilterSheet />
						<RefreshReviewsButton />
					</ButtonGroup>
				</Toolbar>

				{/* Badges de filtres actifs (visible mobile + desktop) */}
				<ReviewsFilterBadges />
			</Suspense>

			{/* Sort badge mobile (visible si sortBy URL défini) */}
			<ReviewsSortBadge />

			{/* Liste mobile */}
			<Suspense fallback={<ReviewsMobileListSkeleton hasActiveFilters={hasActiveFilters} />}>
				<ReviewsMobileList
					reviewsPromise={reviewsPromise}
					perPage={perPage}
					hasActiveFilters={hasActiveFilters}
				/>
			</Suspense>

			{/* DataTable desktop */}
			<Suspense fallback={<ReviewsDataTableSkeleton />}>
				<ReviewsDataTable
					reviewsPromise={reviewsPromise}
					perPage={perPage}
					hasActiveFilters={hasActiveFilters}
				/>
			</Suspense>

			{/* Dialogs des actions long-press / row-actions (toggle status) */}
			<ReviewsAdminDialogs />
		</div>
	);
}
