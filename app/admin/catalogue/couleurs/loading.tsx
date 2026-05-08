import { ColorsDataTableSkeleton } from "@/modules/colors/components/admin/colors-data-table-skeleton";
import { ColorsMobileListSkeleton } from "@/modules/colors/components/admin/colors-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

/**
 * Loading state for colors management page.
 * Aligned with page.tsx: PageHeader + Toolbar + FilterBadges + MobileList + DataTable.
 */
export default function ColorsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des couleurs">
			<span className="sr-only">Chargement des couleurs…</span>

			<PageHeader
				variant="compact"
				title="Couleurs"
				actions={<Skeleton className="h-10 w-36" />}
				className="hidden md:block"
			/>

			<div className="space-y-6">
				<ToolbarSkeleton selectCount={1} buttonCount={2} />

				{/* Filter badges placeholder */}
				<div className="min-h-[1px]" aria-hidden="true" />

				<ColorsMobileListSkeleton />

				<div className="hidden md:block">
					<ColorsDataTableSkeleton />
				</div>
			</div>
		</div>
	);
}
