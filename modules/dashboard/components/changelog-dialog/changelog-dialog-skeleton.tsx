import { Skeleton } from "@/shared/components/ui/skeleton";
import { SparklesIcon } from "lucide-react";

/**
 * Skeleton pour le ChangelogDialog
 * Affiche un bouton similaire au trigger pendant le chargement (Suspense)
 */
export function ChangelogDialogSkeleton() {
	return (
		<div className="flex items-center gap-2 h-9 px-3 border rounded-md opacity-50 pointer-events-none">
			<SparklesIcon className="h-4 w-4 animate-pulse" aria-hidden="true" />
			<Skeleton className="h-4 w-12 hidden sm:block" />
			<span className="sr-only">Chargement du changelog...</span>
		</div>
	);
}
