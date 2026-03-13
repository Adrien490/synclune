import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

/**
 * Skeleton wizard pour mobile
 * Structure: Barre de progression dots + Une section + Footer navigation
 * Step 1 = Visuels (nouvel ordre)
 */
function MobileWizardSkeleton() {
	return (
		<div className="flex min-h-0 flex-col">
			{/* Barre de progression sticky */}
			<div className="bg-background/95 sticky top-0 z-10 -mx-4 border-b px-4 py-3 backdrop-blur-sm">
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
			<div className="space-y-4 py-4">
				{/* Header avec compteur */}
				<div className="flex items-center justify-between">
					<div className="space-y-1">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-3 w-64" />
					</div>
					<Skeleton className="h-6 w-12 rounded-full" />
				</div>

				{/* Info box */}
				<div className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-3">
					<Skeleton className="h-5 w-5" />
					<Skeleton className="h-4 w-48" />
				</div>

				{/* Zone d'upload */}
				<div className="rounded-xl border-2 border-dashed p-8">
					<div className="flex flex-col items-center gap-4">
						<Skeleton className="h-12 w-12 rounded-full" />
						<div className="space-y-2 text-center">
							<Skeleton className="mx-auto h-5 w-40" />
							<Skeleton className="mx-auto h-3 w-52" />
						</div>
					</div>
				</div>
			</div>

			{/* Footer navigation sticky */}
			<div className="bg-background/95 sticky bottom-16 z-10 -mx-4 mt-auto border-t px-4 py-3 backdrop-blur-sm">
				<Skeleton className="h-12 w-full" />
			</div>
		</div>
	);
}

/**
 * Skeleton desktop pour le formulaire complet
 * Structure: Champs en flux continu + Footer
 */
function DesktopFormSkeleton() {
	return (
		<div className="space-y-6 pb-32">
			{/* Visuels */}
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-20" />
					<Skeleton className="h-4 w-48" />
				</CardHeader>
				<CardContent className="space-y-3">
					{/* Header avec compteur */}
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<Skeleton className="h-4 w-16" />
							<Skeleton className="h-3 w-72" />
						</div>
						<Skeleton className="h-6 w-12 rounded-full" />
					</div>

					{/* Zone d'upload */}
					<div className="rounded-lg border-2 border-dashed p-6">
						<div className="flex flex-col items-center gap-3">
							<Skeleton className="h-12 w-12 rounded-full" />
							<Skeleton className="h-5 w-36" />
							<Skeleton className="h-3 w-48" />
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Le bijou */}
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
					<Skeleton className="ml-auto h-3 w-32" />
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
				<div className="space-y-1 border-t pt-4">
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

			{/* Prix et stock */}
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
			<PageHeader title="Nouveau produit" variant="compact" className="hidden md:block" />

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
