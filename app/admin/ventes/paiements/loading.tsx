import { PageHeader } from "@/shared/components/page-header";
import { StripePaymentsDataTableSkeleton } from "@/modules/payments/components/admin/stripe-payments-data-table-skeleton";
import { Toolbar } from "@/shared/components/toolbar";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function PaymentsLoading() {
	return (
		<>
			<PageHeader
				variant="compact"
				title="Paiements"
				description="Consultez tous les paiements Stripe de votre boutique"
			/>

			<div className="space-y-6">
				<Toolbar ariaLabel="Barre d'outils de consultation des paiements">
					<div className="flex-1 w-full sm:max-w-md min-w-0">
						<Skeleton className="h-10 w-full" />
					</div>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
						<Skeleton className="h-10 w-full sm:w-[160px]" />
						<Skeleton className="h-10 w-full sm:w-[180px]" />
						<Skeleton className="h-10 w-10" />
					</div>
				</Toolbar>

				<StripePaymentsDataTableSkeleton />
			</div>
		</>
	);
}
