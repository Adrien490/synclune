import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function EditProductLoadingPage() {
	return (
		<div className="min-h-screen">
			<PageHeader
				title="Modification du bijou..."
				breadcrumbs={[
					{ label: "Catalogue", href: "/admin/catalogue" },
					{ label: "Bijoux", href: "/admin/catalogue/produits" },
				]}
			/>

			<section className="bg-background py-8">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-32">
					{/* Le bijou */}
					<div className="space-y-6">
						{/* Titre */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
						</div>

						{/* Description */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-24 w-full" />
						</div>

						{/* Type + Collections */}
						<div className="space-y-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-10 w-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-10 w-full" />
							</div>
						</div>
					</div>

					{/* Prix et disponibilité */}
					<div className="space-y-6">
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-10 w-full" />
						</div>
						<div className="space-y-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>
						</div>
					</div>

					{/* Galerie */}
					<div className="space-y-4">
						<Skeleton className="h-5 w-32" />
						<div className="grid grid-cols-3 gap-4">
							<Skeleton className="aspect-square rounded-lg" />
							<Skeleton className="aspect-square rounded-lg" />
							<Skeleton className="aspect-square rounded-lg" />
						</div>
					</div>

					{/* Footer */}
					<div className="mt-6">
						<div className="flex justify-end gap-3">
							<Skeleton className="h-10 w-24" />
							<Skeleton className="h-10 w-48" />
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
