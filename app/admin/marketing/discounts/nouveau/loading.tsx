import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CreateDiscountLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du formulaire">
			<span className="sr-only">Chargement du formulaire…</span>

			<h1 className="mb-6 text-2xl font-semibold">Nouveau code promo</h1>

			<div className="max-w-2xl space-y-6">
				{/* RequiredFieldsNote */}
				<Skeleton className="h-4 w-48" />

				{/* Code */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-12" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Type + Value (grid 2 cols) */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="space-y-2">
						<Skeleton className="h-4 w-28" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-3 w-40" />
					</div>
				</div>

				{/* Min Order Amount */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-56" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-3 w-64" />
				</div>

				{/* Max Usage Fields (grid 2 cols) */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="space-y-2">
						<Skeleton className="h-4 w-44" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-52" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>

				{/* Période (grid 2 cols) */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>

				<div className="flex justify-end pt-4">
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
		</div>
	);
}
