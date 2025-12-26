import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CustomerOrdersTableSkeleton } from "@/modules/orders/components/customer/customer-orders-table-skeleton";
import { ACCOUNT_SECTION_PADDING } from "@/shared/constants/spacing";

export default function CustomerOrdersLoading() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Mes commandes"
				description="Retrouvez l'historique de toutes vos commandes"
				breadcrumbs={[
					{ label: "Mon compte", href: "/compte" },
					{ label: "Commandes", href: "/commandes" },
				]}
				actions={<Skeleton className="h-10 w-[200px]" />}
			/>

			<section className={`bg-background ${ACCOUNT_SECTION_PADDING}`}>
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<CustomerOrdersTableSkeleton />
				</div>
			</section>
		</div>
	);
}
