import { SkusDataTableSkeleton } from "@/modules/skus/components/admin/skus-data-table-skeleton";
import { SkusMobileListSkeleton } from "@/modules/skus/components/admin/skus-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";

export default function ProductVariantsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des variantes" className="space-y-6">
			<span className="sr-only">Chargement des variantes…</span>

			{/* Breadcrumb (desktop) — réserve la hauteur même si le slug n'est pas connu */}
			<div className="hidden md:flex md:items-center md:gap-2">
				<Skeleton className="h-4 w-12" />
				<span className="text-muted-foreground">/</span>
				<Skeleton className="h-4 w-20" />
				<span className="text-muted-foreground">/</span>
				<Skeleton className="h-4 w-32" />
				<span className="text-muted-foreground">/</span>
				<Skeleton className="h-4 w-24" />
			</div>

			<PageHeader
				variant="compact"
				title="Variantes du produit"
				description="Gérez les déclinaisons de ce produit"
				actions={
					<div className="flex items-center gap-2">
						<Skeleton className="h-10 w-44" />
						<Skeleton className="h-10 w-44" />
					</div>
				}
				className="hidden md:block"
			/>

			<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<SkusMobileListSkeleton />
			<SkusDataTableSkeleton />
		</div>
	);
}
