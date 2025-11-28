import { FormLayout, FormSection } from "@/shared/components/forms";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Loading skeleton pour la page de création de variante
 * Structure: Custom Header + 4 Form Sections (Image, Variant Data, Prix, Galerie)
 */
export default function CreateVariantLoading() {
	return (
		<div className="space-y-6">
			{/* Custom Header */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-5 w-96" />
			</div>

			{/* Form Sections - 2 columns on desktop */}
			<FormLayout cols={2}>
				{/* Section 1: Média Principal */}
				<FormSection
					title="Média principal"
					description="Image principale de cette variante (requise)"
				>
					<div className="space-y-4">
						{/* Upload zone */}
						<div className="border-2 border-dashed rounded-lg p-8 text-center">
							<Skeleton className="h-48 w-full rounded-md" />
							<div className="mt-4 space-y-2">
								<Skeleton className="h-4 w-48 mx-auto" />
								<Skeleton className="h-3 w-32 mx-auto" />
							</div>
						</div>
					</div>
				</FormSection>

				{/* Section 2: Données de la Variante */}
				<FormSection
					title="Données de la variante"
					description="Les caractéristiques qui distinguent cette variante"
				>
					<div className="space-y-4">
						{/* Color */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<div className="flex gap-2">
								<Skeleton className="h-10 flex-1" />
								<Skeleton className="h-10 w-10 rounded-full" />
							</div>
						</div>

						{/* Material */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>

						{/* Size */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-10 w-full" />
						</div>
					</div>
				</FormSection>

				{/* Section 3: Prix et Disponibilité */}
				<FormSection
					title="Prix et disponibilité"
					description="Tarification et stock pour cette variante"
				>
					<div className="space-y-4">
						{/* Sale Price */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-3 w-40" />
						</div>

						{/* Compare-at Price */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-36" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-3 w-48" />
						</div>

						{/* Inventory */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-3 w-44" />
						</div>
					</div>
				</FormSection>

				{/* Section 4: Galerie d'Images et Vidéos */}
				<FormSection
					title="Galerie d'images et vidéos"
					description="Ajoutez jusqu'à 10 images ou vidéos pour cette variante"
				>
					<div className="space-y-4">
						{/* Media counter badge */}
						<div className="flex items-center justify-between">
							<Skeleton className="h-6 w-32" />
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
				<div className="flex justify-end">
					<Skeleton className="h-10 w-32" />
				</div>
			</div>
		</div>
	);
}
