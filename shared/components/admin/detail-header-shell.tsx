import { cn } from "@/shared/utils/cn";
import * as React from "react";

/**
 * Conteneur d'en-tête des pages de DÉTAIL admin : titre (+ métadonnées) à gauche,
 * actions à droite dès `sm:`, empilés en dessous.
 *
 * Extrait parce que la même chaîne était recopiée **à l'identique dans 20 fichiers**
 * (9 en-têtes de détail + 11 skeletons) — exactement les mêmes fichiers que
 * `DetailStickyActionBar`, avec lequel il est presque toujours utilisé. Les deux
 * restent séparés : la structure interne des en-têtes varie trop (ligne « eyebrow »,
 * variantes `md:hidden`, badges) pour qu'un composant unique à slots l'absorbe sans
 * contraindre les consommateurs.
 */
export function DetailHeaderShell({ className, children, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}
			{...props}
		>
			{children}
		</div>
	);
}
