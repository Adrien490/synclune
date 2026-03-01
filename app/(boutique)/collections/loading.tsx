import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { CollectionGridSkeleton } from "@/modules/collections/components/collection-grid-skeleton";

/**
 * Loading state for collections list page
 * Structure alignée avec page.tsx : PageHeader → CollectionGrid
 */
export default function CollectionsLoading() {
	return (
		<div
			className="relative min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement des collections"
		>
			<span className="sr-only">Chargement des collections...</span>

			{/* Particle system placeholder */}
			<div
				className="from-primary/5 to-secondary/5 fixed inset-0 z-0 via-transparent"
				aria-hidden="true"
			/>

			{/* PageHeaderSkeleton */}
			<PageHeaderSkeleton hasDescription={false} />

			{/* Main Content - Aligné avec page.tsx */}
			<section className="bg-background relative z-10 pt-4 pb-12 lg:pt-6 lg:pb-16">
				<div className="mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
					<CollectionGridSkeleton />
				</div>
			</section>
		</div>
	);
}
