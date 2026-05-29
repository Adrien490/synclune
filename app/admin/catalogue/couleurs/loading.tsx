import { ColorsDataTableSkeleton } from "@/modules/colors/components/admin/colors-data-table-skeleton";
import { ColorsMobileListSkeleton } from "@/modules/colors/components/admin/colors-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function ColorsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des couleurs" className="space-y-6">
			<span className="sr-only">Chargement des couleurs…</span>

			<PageHeader
				variant="compact"
				title="Couleurs"
				actions={<Skeleton className="h-10 w-36" />}
				className="hidden md:block"
			/>

			<StickyActionBarSkeleton itemCount={3} withSearch />

			<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<ColorsMobileListSkeleton />
			<ColorsDataTableSkeleton />
		</div>
	);
}
