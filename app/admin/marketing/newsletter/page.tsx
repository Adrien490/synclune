import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";

import {
	getSubscribers,
	SORT_LABELS,
	SORT_OPTIONS,
} from "@/modules/newsletter/data/get-subscribers";
import { getNewsletterStats } from "@/modules/newsletter/data/get-newsletter-stats";
import { RefreshNewsletterButton } from "@/modules/newsletter/components/admin/refresh-newsletter-button";
import { getFirstParam } from "@/shared/utils/params";
import { Mail, Users } from "lucide-react";
import { Suspense } from "react";
import { SubscribersDataTable } from "@/modules/newsletter/components/admin/subscribers-data-table";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Newsletter | Dashboard",
	description: "Gérez vos abonnés newsletter",
};

interface NewsletterPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewsletterPage({
	searchParams,
}: NewsletterPageProps) {
	const params = await searchParams;
	const stats = await getNewsletterStats();

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) || "forward") as
		| "forward"
		| "backward";
	const sortByParam = getFirstParam(params.sortBy);
	const sortBy =
		sortByParam &&
		Object.values(SORT_OPTIONS).includes(
			sortByParam as (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS]
		)
			? (sortByParam as (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS])
			: SORT_OPTIONS.SUBSCRIBED_DESC;
	const search = getFirstParam(params.search);

	const perPage = parseInt(getFirstParam(params.perPage) || "20", 10);

	const subscribersPromise = getSubscribers({
		cursor,
		direction,
		perPage,
		sortBy,
		search,
		filters: {
			status: undefined,
			subscribedAfter: undefined,
			subscribedBefore: undefined,
		},
	});

	// Convertir SORT_OPTIONS et SORT_LABELS en format attendu par SortSelect
	const sortOptions = Object.values(SORT_OPTIONS).map((value) => ({
		value,
		label: SORT_LABELS[value],
	}));

	return (
		<>
			<PageHeader
				variant="compact"
				title="Newsletter"
			/>

			{/* Statistiques */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Total abonnés
							</p>
							<p className="text-2xl font-bold mt-1">
								{stats.totalSubscribers}
							</p>
						</div>
						<Users className="h-8 w-8 text-muted-foreground" />
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Abonnés actifs
							</p>
							<p className="text-2xl font-bold mt-1 text-secondary-foreground">
								{stats.activeSubscribers}
							</p>
						</div>
						<Mail className="h-8 w-8 text-secondary-foreground" />
					</div>
				</div>

				<div className="rounded-lg border bg-card p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								Désabonnés
							</p>
							<p className="text-2xl font-bold mt-1 text-muted-foreground">
								{stats.inactiveSubscribers}
							</p>
						</div>
						<Users className="h-8 w-8 text-muted-foreground" />
					</div>
				</div>
			</div>

			<Toolbar
				ariaLabel="Barre d'outils de gestion des abonnés"
				search={
					<SearchInput mode="live" size="sm"
						paramName="search"
						placeholder="Rechercher un email..."
						ariaLabel="Rechercher un abonné par email"
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
				<RefreshNewsletterButton />
			</Toolbar>

			<Suspense fallback={<div>Chargement...</div>}>
				<SubscribersDataTable subscribersPromise={subscribersPromise} perPage={perPage} />
			</Suspense>
		</>
	);
}
