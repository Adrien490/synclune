import { Skeleton } from "@/shared/components/ui/skeleton";

export default function OrderCustomerLoading() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement des informations client"
			className="space-y-4"
		>
			<span className="sr-only">Chargement des informations client…</span>
			<Skeleton className="hidden h-7 w-72 md:block" />
			<div className="max-w-2xl space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<div key={i} className="space-y-2">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-10 w-full" />
					</div>
				))}
				<Skeleton className="h-10 w-32" />
			</div>
		</div>
	);
}
