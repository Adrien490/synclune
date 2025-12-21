import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { CustomizationRequestStatus } from "@/app/generated/prisma/client";
import { Toolbar } from "@/shared/components/toolbar";
import { PageHeader } from "@/shared/components/page-header";
import { SearchInput } from "@/shared/components/search-input";
import { SelectFilter } from "@/shared/components/select-filter";
import { getCustomizationRequests } from "@/modules/customizations/data/get-customization-requests";
import { getCustomizationStats } from "@/modules/customizations/data/get-customization-stats";
import { CustomizationsDataTable } from "@/modules/customizations/components/admin/customizations-data-table";
import { SORT_OPTIONS, SORT_LABELS, STATUS_FILTER_OPTIONS } from "@/modules/customizations/constants/sort.constants";
import { getFirstParam } from "@/shared/utils/params";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Sparkles, Clock, CheckCircle2, FileText } from "lucide-react";

export const metadata: Metadata = {
	title: "Personnalisations | Administration",
	description: "Gérer les demandes de personnalisation",
};

interface CustomizationsPageProps {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CustomizationsPage({
	searchParams,
}: CustomizationsPageProps) {
	await connection();

	const params = await searchParams;
	const stats = await getCustomizationStats();

	const cursor = getFirstParam(params.cursor);
	const direction = (getFirstParam(params.direction) || "forward") as "forward" | "backward";
	const sortByParam = getFirstParam(params.sortBy);
	const sortBy =
		sortByParam && Object.values(SORT_OPTIONS).includes(sortByParam as typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS])
			? (sortByParam as typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS])
			: SORT_OPTIONS.CREATED_DESC;
	const search = getFirstParam(params.search);
	const statusParam = getFirstParam(params.filter_status);
	const status =
		statusParam && statusParam !== "ALL" && Object.values(CustomizationRequestStatus).includes(statusParam as CustomizationRequestStatus)
			? (statusParam as CustomizationRequestStatus)
			: undefined;

	const perPage = parseInt(getFirstParam(params.perPage) || "20", 10);

	const requestsPromise = getCustomizationRequests({
		cursor,
		direction,
		perPage,
		sortBy,
		filters: { status, search },
	});

	const sortOptions = Object.entries(SORT_LABELS).map(([value, label]) => ({
		value,
		label,
	}));

	return (
		<>
			<PageHeader variant="compact" title="Personnalisations" />

			{/* Statistiques */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatCard
					title="En attente"
					value={stats.pending}
					icon={<Clock className="h-5 w-5" />}
					highlight
				/>
				<StatCard
					title="En cours"
					value={stats.inProgress}
					icon={<Sparkles className="h-5 w-5" />}
				/>
				<StatCard
					title="Terminées"
					value={stats.completed}
					icon={<FileText className="h-5 w-5" />}
				/>
				<StatCard
					title="Finalisées"
					value={stats.closed}
					icon={<CheckCircle2 className="h-5 w-5" />}
				/>
			</div>

			<div className="space-y-6">
				<Toolbar
					ariaLabel="Barre d'outils de gestion des personnalisations"
					search={
						<SearchInput mode="live" size="sm"
							paramName="search"
							placeholder="Rechercher par nom, email..."
							ariaLabel="Rechercher une demande"
							className="w-full"
						/>
					}
				>
					<SelectFilter
						filterKey="filter_status"
						label="Statut"
						options={STATUS_FILTER_OPTIONS.map((opt) => ({
							value: opt.value,
							label: opt.label,
						}))}
						placeholder="Tous les statuts"
						className="w-full sm:min-w-[160px]"
					/>
					<SelectFilter
						filterKey="sortBy"
						label="Trier par"
						options={sortOptions}
						placeholder="Plus récentes"
						className="w-full sm:min-w-[160px]"
					/>
				</Toolbar>

				<Suspense fallback={<TableSkeleton />}>
					<CustomizationsDataTable
						requestsPromise={requestsPromise}
						perPage={perPage}
					/>
				</Suspense>
			</div>
		</>
	);
}

function StatCard({
	title,
	value,
	icon,
	highlight,
}: {
	title: string;
	value: number;
	icon: React.ReactNode;
	highlight?: boolean;
}) {
	return (
		<div className={`rounded-lg border bg-card p-4 ${highlight && value > 0 ? "border-amber-200 bg-amber-50/50" : ""}`}>
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-muted-foreground">{title}</p>
					<p className={`text-2xl font-bold mt-1 ${highlight && value > 0 ? "text-amber-600" : ""}`}>
						{value}
					</p>
				</div>
				<div className={`${highlight && value > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
					{icon}
				</div>
			</div>
		</div>
	);
}

function TableSkeleton() {
	return (
		<div className="rounded-lg border bg-card">
			<div className="p-4 space-y-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<div key={i} className="flex items-center gap-4">
						<Skeleton className="h-10 flex-1" />
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-20" />
					</div>
				))}
			</div>
		</div>
	);
}
