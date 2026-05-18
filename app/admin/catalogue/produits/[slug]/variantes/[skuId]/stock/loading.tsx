import { Skeleton } from "@/shared/components/ui/skeleton";

export default function AdjustStockLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du formulaire de stock"
			className="space-y-4"
		>
			<span className="sr-only">Chargement du formulaire de stock…</span>
			<Skeleton className="hidden h-7 w-44 md:block" />
			<div className="max-w-2xl space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-20 w-full" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>
		</div>
	);
}
