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
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import { getFirstParam } from "@/shared/utils/params";
import { Mail, Users } from "lucide-react";
import { Suspense } from "react";
import { SubscribersDataTable } from "@/modules/newsletter/components/admin/subscribers-data-table";
import { SubscribersDataTableSkeleton } from "@/modules/newsletter/components/admin/subscribers-data-table-skeleton";
import { type Metadata } from "next";
import { connection } from "next/server";

export const metadata: Metadata = {
	title: "Newsletter | Dashboard",
	description: "Gérez vos abonnés newsletter",
};

interface NewsletterPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NewsletterPage({ searchParams }: NewsletterPageProps) {
	await connection();
	const params = await searchParams;
	const statsPromise = getNewsletterStats();

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) ?? "forward") as "forward" | "backward";
	const sortByParam = getFirstParam(params.sortBy);
	const sortBy =
		sortByParam &&
		Object.values(SORT_OPTIONS).includes(
			sortByParam as (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS],
		)
			? (sortByParam as (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS])
			: SORT_OPTIONS.SUBSCRIBED_DESC;
	const search = getFirstParam(params.search);

	const perPage = parseInt(getFirstParam(params.perPage) ?? "20", 10);

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

	const stats = await statsPromise;

	// Convertir SORT_OPTIONS et SORT_LABELS en format attendu par SortSelect
	const sortOptions = Object.values(SORT_OPTIONS).map((value) => ({
		value,
		label: SORT_LABELS[value],
	}));

	return (
		<>
			<PageHeader variant="compact" title="Newsletter" className="hidden md:block" />

			{/* Statistiques */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Total abonnés</p>
							<p className="mt-1 text-2xl font-bold">{stats.totalSubscribers}</p>
						</div>
						<Users className="text-muted-foreground h-8 w-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Abonnés actifs</p>
							<p className="text-secondary-foreground mt-1 text-2xl font-bold">
								{stats.activeSubscribers}
							</p>
						</div>
						<Mail className="text-secondary-foreground h-8 w-8" />
					</div>
				</div>

				<div className="bg-card rounded-lg border p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-muted-foreground text-sm font-medium">Désabonnés</p>
							<p className="text-muted-foreground mt-1 text-2xl font-bold">
								{stats.inactiveSubscribers}
							</p>
						</div>
						<Users className="text-muted-foreground h-8 w-8" />
					</div>
				</div>
			</div>

			<Suspense fallback={<ToolbarSkeleton selectCount={1} buttonCount={1} />}>
				<Toolbar
					ariaLabel="Barre d'outils de gestion des abonnés"
					search={
						<SearchInput
							mode="live"
							size="sm"
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
			</Suspense>

			<Suspense fallback={<SubscribersDataTableSkeleton />}>
				<SubscribersDataTable subscribersPromise={subscribersPromise} perPage={perPage} />
			</Suspense>
		</>
	);
}
