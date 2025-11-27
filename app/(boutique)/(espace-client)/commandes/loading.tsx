import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CustomerOrdersTableSkeleton } from "@/modules/orders/components/customer";

export default function CustomerOrdersLoading() {
	const breadcrumbs = [
		{ label: "Mon compte", href: "/compte" },
		{ label: "Mes commandes", href: "/commandes" },
	];

	return (
		<>
			<PageHeader
				title="Mes commandes"
				description="Retrouvez l'historique de toutes vos commandes"
				breadcrumbs={breadcrumbs}
			/>

			<section className="bg-background py-8 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					{/* Tri skeleton */}
					<div className="flex justify-end">
						<Skeleton className="h-10 w-[200px]" />
					</div>

					<CustomerOrdersTableSkeleton />
				</div>
			</section>
		</>
	);
}
