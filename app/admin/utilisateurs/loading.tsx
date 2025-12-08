import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { UsersDataTableSkeleton } from "@/modules/users/components/admin/users-data-table-skeleton";

/**
 * Loading state for users management page
 * Structure alignee avec la vraie page:
 * - PageHeader avec bouton create
 * - TabNavigation
 * - Toolbar
 * - UsersDataTable
 */
export default function UsersLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des utilisateurs">
			<span className="sr-only">Chargement des utilisateurs...</span>

			{/* Page Header */}
			<PageHeader
				variant="compact"
				title="Utilisateurs"
				actions={<Skeleton className="h-10 w-40" />}
			/>

			{/* Tab Navigation skeleton */}
			<div className="mb-6 flex gap-1 border-b">
				<Skeleton className="h-10 w-32" />
				<Skeleton className="h-10 w-28" />
			</div>

			<div className="space-y-6">
				{/* Toolbar skeleton */}
				<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
					<Skeleton className="h-10 flex-1 sm:max-w-md" />
					<Skeleton className="h-10 w-full sm:w-[180px]" />
					<Skeleton className="h-10 w-10" />
					<Skeleton className="h-10 w-10" />
				</div>

				{/* Data Table */}
				<UsersDataTableSkeleton />
			</div>
		</div>
	);
}
