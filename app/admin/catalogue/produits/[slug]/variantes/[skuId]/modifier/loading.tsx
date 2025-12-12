import { FormLayout, FormSection } from "@/shared/components/forms";
import { PageHeaderSkeleton } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page d'édition de variante
 * Structure: PageHeader + 4 Form Sections (Image, Données, Prix, Galerie)
 */
export default function EditVariantLoading() {
	return (
		<>
			{/* Page Header Skeleton */}
			<PageHeaderSkeleton variant="compact" />

			<div className="space-y-6">
				{/* Form Sections */}
				<FormLayout>
					{/* Section 1: Média Principal */}
					<FormSection
						title="Média principal"
						description="Image principale de cette variante"
					>
						<div className="space-y-4">
							{/* Upload zone */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-48 w-full rounded-md" />
							</div>
						</div>
					</FormSection>

					{/* Section 2: Informations de base */}
					<FormSection
						title="Informations de base"
						description="Détails de la variante"
					>
						<div className="space-y-4">
							{/* SKU (readonly) */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-12" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-3 w-48" />
							</div>

							{/* Color */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Material + Size */}
							<div className="space-y-4">
								<div className="space-y-2">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-10 w-full" />
								</div>
								<div className="space-y-2">
									<Skeleton className="h-4 w-16" />
									<Skeleton className="h-10 w-full" />
								</div>
							</div>
						</div>
					</FormSection>
				</FormLayout>

				{/* Prix et Disponibilité */}
				<FormLayout>
					<FormSection title="Prix" description="Configuration des prix">
						<div className="space-y-4">
							{/* Prix TTC */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Prix comparé */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-36" />
								<Skeleton className="h-10 w-full" />
							</div>
						</div>
					</FormSection>

					<FormSection title="Disponibilité" description="Stock et statut">
						<div className="space-y-4">
							{/* Stock */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-10 w-full" />
							</div>

							{/* Statut */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-16" />
								<div className="flex gap-4">
									<Skeleton className="h-6 w-20" />
									<Skeleton className="h-6 w-20" />
								</div>
							</div>

							{/* Par défaut */}
							<div className="space-y-2">
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-3 w-64" />
							</div>
						</div>
					</FormSection>
				</FormLayout>

				{/* Galerie */}
				<FormLayout>
					<FormSection
						title="Galerie d'images"
						description="Images supplémentaires (max 10)"
					>
						<div className="space-y-4">
							{/* Media counter */}
							<div className="flex items-center justify-between">
								<Skeleton className="h-5 w-24" />
								<Skeleton className="h-6 w-16" />
							</div>

							{/* Upload zone */}
							<div className="border-2 border-dashed rounded-lg p-8 text-center">
								<Skeleton className="h-32 w-full rounded-md" />
								<div className="mt-4 space-y-2">
									<Skeleton className="h-4 w-56 mx-auto" />
									<Skeleton className="h-3 w-32 mx-auto" />
								</div>
							</div>
						</div>
					</FormSection>
				</FormLayout>

				{/* Form Footer */}
				<div className="mt-6">
					<div className="flex justify-between items-center gap-4">
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-40" />
					</div>
				</div>
			</div>
		</>
	);
}
