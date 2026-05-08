import { PageHeader } from "@/shared/components/page-header";
import { Card, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function VentesLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des ventes">
			<span className="sr-only">Chargement des ventes…</span>

			<PageHeader
				variant="compact"
				title="Ventes"
				description="Gérez vos commandes et remboursements"
				className="hidden md:block"
			/>

			{/* Mobile description (mirror SectionNavigation) */}
			<div className="mb-4 md:hidden">
				<Skeleton className="h-4 w-72 max-w-full" />
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{Array.from({ length: 2 }).map((_, i) => (
					<Card key={i} className="h-full">
						<CardHeader>
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-3">
									<Skeleton className="size-10 rounded-lg" />
									<div className="space-y-2">
										<Skeleton className="h-5 w-24" />
										<Skeleton className="h-4 w-40" />
									</div>
								</div>
							</div>
						</CardHeader>
					</Card>
				))}
			</div>
		</div>
	);
}
