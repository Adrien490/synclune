import { Skeleton } from "@/shared/components/ui/skeleton";

export default function UpdatePriceLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du formulaire de prix"
			className="space-y-4"
		>
			<span className="sr-only">Chargement du formulaire de prix…</span>
			<Skeleton className="hidden h-7 w-48 md:block" />
			<div className="max-w-2xl space-y-4">
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
				</div>
				<div className="space-y-2">
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-10 w-full" />
				</div>
				<Skeleton className="h-10 w-32" />
			</div>
		</div>
	);
}
