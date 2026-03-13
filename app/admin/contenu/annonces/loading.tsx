import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function AnnouncementsLoading() {
	return (
		<div role="status" aria-busy="true" aria-label="Chargement des annonces">
			<span className="sr-only">Chargement des annonces...</span>

			<PageHeader
				variant="compact"
				title="Annonces"
				description="Gérez les annonces promotionnelles affichées sur la boutique"
				actions={<Skeleton className="h-10 w-40" />}
				className="hidden md:block"
			/>

			<div className="space-y-3">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		</div>
	);
}
