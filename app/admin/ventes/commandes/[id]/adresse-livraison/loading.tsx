import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ShippingAddressLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement de l'adresse de livraison"
			className="space-y-4"
		>
			<span className="sr-only">Chargement de l&apos;adresse de livraison…</span>
			<Skeleton className="hidden h-7 w-80 md:block" />
			<div className="max-w-2xl space-y-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{Array.from({ length: 2 }).map((_, i) => (
						<div key={i} className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>
					))}
				</div>
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-10 w-full" />
					</div>
				))}
				<Skeleton className="h-10 w-32" />
			</div>
		</div>
	);
}
