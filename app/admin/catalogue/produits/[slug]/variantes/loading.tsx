import { SkusDataTableSkeleton } from "@/modules/skus/components/admin/skus-data-table-skeleton";
import { SkusMobileListSkeleton } from "@/modules/skus/components/admin/skus-mobile-list-skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { StickyActionBarSkeleton } from "@/shared/components/sticky-action-bar";
import { ToolbarSkeleton } from "@/shared/components/toolbar-skeleton";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ProductVariantsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des variantes" className="space-y-6">
			<span className="sr-only">Chargement des variantes…</span>

			<Breadcrumb className="hidden md:block">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/admin/catalogue/produits">Produits</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-32" />
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<Skeleton className="h-4 w-20" />
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

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

			<StickyActionBarSkeleton itemCount={3} />

			<ToolbarSkeleton selectCount={1} buttonCount={2} className="hidden md:flex" />

			<div className="min-h-[1px]" aria-hidden="true" />

			<SkusMobileListSkeleton />
			<SkusDataTableSkeleton />
		</div>
	);
}
