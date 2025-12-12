import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { CollectionGridSkeleton } from "@/modules/collections/components/collection-grid-skeleton";

/**
 * Loading state for collections list page
 * Structure alignée avec page.tsx : PageHeader → CollectionGrid
 */
export default function CollectionsLoading() {
	return (
		<div
			className="min-h-screen relative"
			role="status"
			aria-busy="true"
			aria-label="Chargement des collections"
		>
			<span className="sr-only">Chargement des collections...</span>

			{/* Particle system placeholder */}
			<div
				className="fixed inset-0 z-0 from-primary/5 via-transparent to-secondary/5"
				aria-hidden="true"
			/>

			{/* PageHeaderSkeleton */}
			<PageHeaderSkeleton hasDescription={false} />

			{/* Main Content - Aligné avec page.tsx */}
			<section className="bg-background pt-4 pb-12 lg:pt-6 lg:pb-16 relative z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
					<CollectionGridSkeleton />
				</div>
			</section>
		</div>
	);
}
