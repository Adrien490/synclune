import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { ProductListSkeleton } from "@/modules/products/components/product-list-skeleton";

export default function CollectionDetailLoading() {
	return (
		<div
			className="min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la collection"
		>
			<span className="sr-only">Chargement de la collection...</span>

			<PageHeaderSkeleton hasDescription />

			<section className="bg-background pt-6 pb-12 lg:pt-8 lg:pb-16">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<ProductListSkeleton />
				</div>
			</section>
		</div>
	);
}
