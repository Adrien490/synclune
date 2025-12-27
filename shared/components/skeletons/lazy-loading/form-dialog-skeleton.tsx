"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { Skeleton, SkeletonButton, SkeletonGroup } from "@/shared/components/ui/skeleton";

interface FormDialogSkeletonProps {
	/** Nombre de champs de formulaire a afficher */
	fieldCount?: number;
	/** Afficher une zone de color picker */
	showColorPicker?: boolean;
	/** Largeur du dialog */
	size?: "sm" | "md" | "lg";
}

/**
 * Skeleton generique pour les dialogs de formulaire
 * Utilisable pour Color, Material, ProductType dialogs
 */
export function FormDialogSkeleton({
	fieldCount = 3,
	showColorPicker = false,
	size = "sm",
}: FormDialogSkeletonProps) {
	const sizeClass = {
		sm: "sm:max-w-md",
		md: "sm:max-w-lg",
		lg: "sm:max-w-xl",
	};

	return (
		<ResponsiveDialog open>
			<ResponsiveDialogContent className={sizeClass[size]}>
				<SkeletonGroup label="Chargement du formulaire">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle asChild>
							<Skeleton className="h-6 w-40" />
						</ResponsiveDialogTitle>
						<ResponsiveDialogDescription asChild>
							<Skeleton className="h-4 w-56" />
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<div className="py-4 space-y-4">
						{/* Color picker section */}
						{showColorPicker && (
							<div className="space-y-2">
								<Skeleton className="h-4 w-16" />
								<div className="flex gap-4">
									<Skeleton className="size-32 rounded-lg" />
									<div className="flex-1 space-y-2">
										<Skeleton className="h-6 w-full rounded" />
										<Skeleton className="h-6 w-full rounded" />
									</div>
								</div>
							</div>
						)}

						{/* Form fields */}
						{Array.from({ length: fieldCount }).map((_, i) => (
							<div key={i} className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-10 w-full rounded-md" />
							</div>
						))}
					</div>

					<ResponsiveDialogFooter className="gap-2">
						<SkeletonButton />
						<SkeletonButton />
					</ResponsiveDialogFooter>
				</SkeletonGroup>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}

/**
 * Skeleton specifique pour le Color Form Dialog
 */
export function ColorFormDialogSkeleton() {
	return <FormDialogSkeleton fieldCount={2} showColorPicker size="md" />;
}

/**
 * Skeleton specifique pour le Material Form Dialog
 */
export function MaterialFormDialogSkeleton() {
	return <FormDialogSkeleton fieldCount={2} />;
}

/**
 * Skeleton specifique pour le Product Type Form Dialog
 */
export function ProductTypeFormDialogSkeleton() {
	return <FormDialogSkeleton fieldCount={3} />;
}
