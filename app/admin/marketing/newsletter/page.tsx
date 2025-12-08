import { NewsletterStatus } from "@/app/generated/prisma/client";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchForm } from "@/shared/components/search-form";
import { SelectFilter } from "@/shared/components/select-filter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { ExportSubscribersButton } from "@/modules/newsletter/components/admin/export-subscribers-button";
import {
	getSubscribers,
	SORT_LABELS,
	SORT_OPTIONS,
} from "@/modules/newsletter/data/get-subscribers";
import { RefreshNewsletterButton } from "@/modules/newsletter/components/admin/refresh-newsletter-button";
import { SendNewsletterEmailForm } from "@/modules/newsletter/components/admin/send-newsletter-email-form";
import { prisma } from "@/shared/lib/prisma";
import { getFirstParam } from "@/shared/utils/params";
import { Mail, Users } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { SubscribersDataTable } from "@/modules/newsletter/components/admin/subscribers-data-table";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Newsletter | Dashboard",
	description: "Envoyez des newsletters et gérez vos abonnés",
};

interface NewsletterPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getNewsletterStats() {
	const [totalSubscribers, activeSubscribers] = await Promise.all([
		prisma.newsletterSubscriber.count(),
		prisma.newsletterSubscriber.count({
			where: {
				status: NewsletterStatus.CONFIRMED,
			},
		}),
	]);

	return {
		totalSubscribers,
		activeSubscribers,
		inactiveSubscribers: totalSubscribers - activeSubscribers,
	};
}

export default async function NewsletterPage({
	searchParams,
}: NewsletterPageProps) {
	// Force dynamic rendering to enable use cache: remote in functions
	await connection();

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

			{/* Tabs */}
			<Tabs defaultValue="send" className="space-y-6">
				<TabsList>
					<TabsTrigger value="send">Envoyer une newsletter</TabsTrigger>
					<TabsTrigger value="subscribers">
						Abonnés ({stats.totalSubscribers})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="send" className="space-y-6">
					<div className="rounded-lg border bg-card p-6">
						<div className="mb-6">
							<h2 className="text-xl font-semibold">Composer une newsletter</h2>
							<p className="text-sm text-muted-foreground mt-1">
								L'email sera envoyé à tous les {stats.activeSubscribers}{" "}
								abonné(s) actif(s)
							</p>
						</div>

						{stats.activeSubscribers === 0 ? (
							<div className="rounded-md bg-muted/50 p-8 text-center">
								<Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
								<p className="text-sm text-muted-foreground">
									Aucun abonné actif pour le moment.
								</p>
							</div>
						) : (
							<SendNewsletterEmailForm />
						)}
					</div>
				</TabsContent>

				<TabsContent value="subscribers" className="space-y-6">
					<Toolbar
						ariaLabel="Barre d'outils de gestion des abonnés"
						search={
							<SearchForm
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
							className="w-full sm:min-w-[180px]"
						/>
						<ExportSubscribersButton />
						<RefreshNewsletterButton />
					</Toolbar>

					<Suspense fallback={<div>Chargement...</div>}>
						<SubscribersDataTable subscribersPromise={subscribersPromise} />
					</Suspense>
				</TabsContent>
			</Tabs>
		</>
	);
}
