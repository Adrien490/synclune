import { PageHeader } from "@/shared/components/page-header";
import { FormLayout, FormSection } from "@/shared/components/forms";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton wizard pour mobile
 * Structure: Barre de progression dots + Une section + Footer navigation
 * Step 1 = Visuels (nouvel ordre)
 */
function MobileWizardSkeleton() {
	return (
		<div className="flex flex-col min-h-0">
			{/* Barre de progression sticky */}
			<div className="sticky top-0 z-10 -mx-4 px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
				<div className="flex items-center justify-between gap-4">
					{/* 3 dots de progression */}
					<div className="flex gap-2">
						<Skeleton className="size-3 rounded-full" />
						<Skeleton className="size-3 rounded-full" />
						<Skeleton className="size-3 rounded-full" />
					</div>
					{/* Label de l'étape */}
					<Skeleton className="h-4 w-16" />
				</div>
			</div>

			{/* Contenu - première étape (Visuels) */}
			<div className="py-4 space-y-4">
				{/* Header avec compteur */}
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-3 w-64" />
					</div>
					<Skeleton className="h-6 w-12 rounded-full" />
				</div>

				{/* Info box */}
				<div className="flex items-center gap-3 py-3 px-3 rounded-lg border border-dashed">
					<Skeleton className="h-5 w-5" />
					<Skeleton className="h-4 w-48" />
				</div>

				{/* Zone d'upload */}
				<div className="border-2 border-dashed rounded-xl p-8">
					<div className="flex flex-col items-center gap-4">
						<Skeleton className="h-12 w-12 rounded-full" />
						<div className="text-center space-y-2">
							<Skeleton className="h-5 w-40 mx-auto" />
							<Skeleton className="h-3 w-52 mx-auto" />
						</div>
					</div>
				</div>
			</div>

			{/* Footer navigation sticky */}
			<div className="sticky bottom-16 z-10 -mx-4 px-4 py-3 border-t bg-background/95 backdrop-blur-sm mt-auto">
				<Skeleton className="h-12 w-full" />
			</div>
		</div>
	);
}

/**
 * Skeleton desktop pour le formulaire complet
 * Structure: Section visuels + 2 sections en grille + Footer
 * Ordre: Visuels → Le bijou → Prix
 */
function DesktopFormSkeleton() {
	return (
		<div className="space-y-6 pb-32">
			{/* Section 1: Visuels (full-width) */}
			<FormSection
				title="Visuels"
				description="Images et vidéos du produit"
			>
				<div className="space-y-3">
					{/* Header avec compteur */}
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-3 w-72" />
						</div>
						<Skeleton className="h-6 w-12 rounded-full" />
					</div>

					{/* Zone d'upload */}
					<div className="border-2 border-dashed rounded-lg p-6">
						<div className="flex flex-col items-center gap-3">
							<Skeleton className="h-12 w-12 rounded-full" />
							<Skeleton className="h-5 w-36" />
							<Skeleton className="h-3 w-48" />
						</div>
					</div>
				</div>
			</FormSection>

			{/* Sections 2 & 3 */}
			<FormLayout>
				{/* Section 2: Le bijou */}
				<FormSection
					title="Le bijou"
					description="Informations et caractéristiques"
				>
					<div className="space-y-6">
						{/* Titre */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-28" />
							<Skeleton className="h-10 w-full" />
						</div>

						{/* Description */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-24 w-full" />
							<Skeleton className="h-3 w-32 ml-auto" />
						</div>

						{/* Type + Collections */}
						<div className="space-y-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-10 w-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-10 w-full" />
							</div>
						</div>

						{/* Séparateur attributs variante */}
						<div className="pt-4 border-t space-y-1">
							<div className="flex items-center gap-2">
								<Skeleton className="h-4 w-36" />
								<Skeleton className="h-3.5 w-3.5 rounded-full" />
							</div>
							<Skeleton className="h-3 w-52" />
						</div>

						{/* Couleur */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>

						{/* Matériau + Taille */}
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

				{/* Section 3: Prix et stock */}
				<FormSection
					title="Prix et stock"
					description="Tarification et disponibilité"
				>
					<div className="space-y-6">
						{/* Prix de vente */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-3 w-40" />
						</div>

						{/* Ancien prix (barré) */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-40" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-3 w-56" />
						</div>

						{/* Stock */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-32" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-3 w-52" />
						</div>
					</div>
				</FormSection>
			</FormLayout>

			{/* Footer */}
			<div className="flex justify-end gap-3">
				<Skeleton className="h-10 w-48" />
				<Skeleton className="h-10 w-36" />
			</div>
		</div>
	);
}

/**
 * Loading skeleton adaptatif pour la page de création de produit
 * - Mobile: Wizard avec une étape à la fois (Step 1 = Visuels)
 * - Desktop: Formulaire complet (Visuels en haut, puis grille)
 */
export default function CreateProductLoading() {
	return (
		<>
			<PageHeader title="Nouveau produit" variant="compact" />

			{/* Mobile: Wizard skeleton */}
			<div className="md:hidden">
				<MobileWizardSkeleton />
			</div>

			{/* Desktop: Formulaire complet */}
			<div className="hidden md:block">
				<DesktopFormSkeleton />
			</div>
		</>
	);
}
