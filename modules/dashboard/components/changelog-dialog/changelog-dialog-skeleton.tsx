import { Skeleton } from "@/shared/components/ui/skeleton";
import { SparklesIcon } from "lucide-react";

/**
 * Skeleton pour le ChangelogDialog
 * Affiche un bouton similaire au trigger pendant le chargement (Suspense)
 */
export function ChangelogDialogSkeleton() {
	return (
		<div className="flex items-center gap-2 px-2 py-1.5 text-xs opacity-50 pointer-events-none">
			<SparklesIcon className="size-3 animate-pulse" aria-hidden="true" />
			<Skeleton className="h-3 w-10" />
			<span className="sr-only">Chargement du changelog...</span>
		</div>
	);
}
