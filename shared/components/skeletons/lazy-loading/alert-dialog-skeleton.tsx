"use client";

import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Skeleton, SkeletonButton, SkeletonGroup } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour les AlertDialogs
 * Affiche un dialog de confirmation placeholder
 */
export function AlertDialogSkeleton() {
	return (
		<AlertDialog open>
			<AlertDialogContent>
				<SkeletonGroup label="Chargement de la confirmation">
					<AlertDialogHeader>
						<AlertDialogTitle asChild>
							<Skeleton className="h-5 w-48" />
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-2">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-3/4" />
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<SkeletonButton />
						<SkeletonButton />
					</AlertDialogFooter>
				</SkeletonGroup>
			</AlertDialogContent>
		</AlertDialog>
	);
}
