import { PageHeader } from "@/shared/components/page-header";
import { FormLayout, FormSection } from "@/shared/components/tanstack-form";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton wizard pour mobile
 * Structure: Barre de progression dots + Une section + Footer navigation
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
					<Skeleton className="h-4 w-20" />
				</div>
			</div>

			{/* Contenu - première étape (Le bijou) */}
			<div className="py-4 space-y-6">
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

				{/* Type de bijou */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-28" />
					<Skeleton className="h-10 w-full" />
				</div>

				{/* Collections */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-3 w-56" />
				</div>

				{/* Couleur */}
				<div className="space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-10 w-full" />
				</div>
			</div>

			{/* Footer navigation sticky */}
			<div className="sticky bottom-16 z-10 -mx-4 px-4 py-3 border-t bg-background/95 backdrop-blur-sm mt-auto">
				<div className="flex gap-3">
					<Skeleton className="h-12 flex-1" />
					<Skeleton className="h-12 flex-1" />
				</div>
			</div>
		</div>
	);
}

/**
 * Skeleton desktop pour le formulaire complet
 * Structure: Header + 2 sections en grille + Section visuels + Footer
 */
function DesktopFormSkeleton() {
	return (
		<div className="space-y-6 pb-32">
			{/* Sections 1 & 2 en grille */}
			<FormLayout cols={2}>
				{/* Section 1: Le bijou */}
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
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Skeleton className="h-4 w-28" />
								<Skeleton className="h-10 w-full" />
							</div>
							<div className="space-y-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-10 w-full" />
							</div>
						</div>

						{/* Couleur */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-20" />
							<Skeleton className="h-10 w-full" />
						</div>

						{/* Matériau + Taille */}
						<div className="grid grid-cols-2 gap-4">
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

				{/* Section 2: Prix et stock */}
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

						{/* Prix comparé */}
						<div className="space-y-2">
							<Skeleton className="h-4 w-44" />
							<Skeleton className="h-10 w-full" />
							<Skeleton className="h-3 w-64" />
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

			{/* Section 3: Visuels */}
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
 * - Mobile: Wizard avec une étape à la fois
 * - Desktop: Formulaire complet en grille
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
