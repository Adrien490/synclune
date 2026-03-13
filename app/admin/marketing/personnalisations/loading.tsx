import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function CustomizationsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des personnalisations">
			<span className="sr-only">Chargement des personnalisations...</span>

			<PageHeader variant="compact" title="Personnalisations" className="hidden md:block" />

			{/* Stats grid */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="bg-card rounded-lg border p-4">
						<div className="flex items-center justify-between">
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-8 w-12" />
							</div>
							<Skeleton className="h-5 w-5" />
						</div>
					</div>
				))}
			</div>

			{/* Toolbar */}
			<div className="space-y-6">
				<div className="flex items-center gap-3">
					<Skeleton className="h-9 max-w-sm flex-1" />
					<Skeleton className="h-9 w-40" />
					<Skeleton className="h-9 w-40" />
				</div>

				{/* Table */}
				<div className="bg-card rounded-lg border">
					<div className="space-y-4 p-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="flex items-center gap-4">
								<Skeleton className="h-10 flex-1" />
								<Skeleton className="h-10 w-24" />
								<Skeleton className="h-10 w-20" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
