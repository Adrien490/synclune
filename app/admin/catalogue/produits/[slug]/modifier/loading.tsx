import { FormLayout, FormSection } from "@/shared/components/forms";
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
					{/* SECTIONS 1 & 2 : Image principale + Informations générales */}
					<FormLayout>
						{/* Image principale */}
						<FormSection
							title="Média principal"
							description="Chargement de l'image principale..."
						>
							<Skeleton className="h-64 w-full rounded-lg" />
						</FormSection>

						{/* Informations générales */}
						<FormSection
							title="Informations générales"
							description="Chargement des informations..."
						>
							<div className="space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-24 w-full" />
								</div>
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
						</FormSection>
					</FormLayout>

					{/* SECTIONS 3 & 4 : Prix et galerie */}
					<FormLayout>
						{/* Prix et disponibilité */}
						<FormSection
							title="Prix et disponibilité"
							description="Chargement des informations de prix..."
						>
							<div className="space-y-4">
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
						</FormSection>

						{/* Galerie */}
						<FormSection
							title="Galerie d'images"
							description="Chargement de la galerie..."
						>
							<div className="grid grid-cols-3 gap-4">
								<Skeleton className="aspect-square rounded-lg" />
								<Skeleton className="aspect-square rounded-lg" />
								<Skeleton className="aspect-square rounded-lg" />
							</div>
						</FormSection>
					</FormLayout>

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
