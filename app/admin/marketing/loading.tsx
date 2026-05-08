import { PageHeader } from "@/shared/components/page-header";
import { Card, CardHeader } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function MarketingLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement du marketing">
			<span className="sr-only">Chargement du marketing...</span>

			<PageHeader
				variant="compact"
				title="Marketing"
				description="Gérez vos codes promo et avis clients"
				className="hidden md:block"
			/>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{Array.from({ length: 2 }).map((_, i) => (
					<Card key={i} className="h-full">
						<CardHeader>
							<div className="flex items-start justify-between">
								<div className="flex items-center gap-3">
									<Skeleton className="h-10 w-10 rounded-lg" />
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
