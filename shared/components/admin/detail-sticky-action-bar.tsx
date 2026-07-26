import { cn } from "@/shared/utils/cn";
import * as React from "react";

/**
 * Barre d'actions des pages de DÉTAIL admin — pendant de `AdminFormFooter`
 * (formulaires), dont elle diffère volontairement : bordure supérieure + fond plus
 * opaque, car elle surmonte du contenu défilant plutôt que la fin d'un formulaire.
 *
 * Mobile : sticky au-dessus de l'`AdminMobileBottomBar`, safe-area-inset-bottom,
 * backdrop-blur. Desktop (≥ md) : statique — les actions reviennent en ligne dans
 * l'en-tête, le scroll naturel du `<main>` suffit.
 *
 * Ce composant existe parce que la même chaîne de 13 utilitaires était recopiée
 * **à l'identique dans 20 fichiers** (9 en-têtes de détail + 11 skeletons), sans
 * aucune SSOT : la moindre correction de l'offset safe-area devait être appliquée
 * 20 fois. Ne pas remettre la chaîne en dur — étendre ici.
 */
export function DetailStickyActionBar({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] flex items-center gap-2 border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md",
				"md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}
