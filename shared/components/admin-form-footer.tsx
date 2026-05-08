import { cn } from "@/shared/utils/cn";
import * as React from "react";

interface AdminFormFooterProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Indicateur d'état pending pour aria-live status (sr-only). */
	pending?: boolean;
	/** Message sr-only personnalisé pendant le pending. Défaut : "Envoi du formulaire en cours...". */
	pendingMessage?: string;
}

/**
 * Footer sticky pour formulaires admin — pattern unifié 2026.
 *
 * Mobile : sticky bottom au-dessus de l'`AdminMobileBottomBar`, safe-area-inset-bottom,
 * backdrop-blur. Desktop (≥ md) : statique (le sticky desktop est déjà géré par
 * le scroll naturel du `<main>`).
 *
 * Inclut une région sr-only `aria-live="polite"` qui annonce l'état pending au
 * lecteur d'écran. Pas de bouton intégré : chaque form porte sa propre logique
 * de submit (text dynamique, hooks, hint clavier, etc.).
 */
export function AdminFormFooter({
	pending,
	pendingMessage = "Envoi du formulaire en cours…",
	className,
	children,
	...props
}: AdminFormFooterProps) {
	return (
		<div
			className={cn(
				"bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-[var(--admin-main-x,1.5rem)] border-t px-[var(--admin-main-x,1.5rem)] py-3 backdrop-blur-md motion-safe:transition-[backdrop-filter]",
				"md:static md:m-0 md:border-0 md:bg-transparent md:p-0 md:pb-0 md:backdrop-blur-none",
				className,
			)}
			{...props}
		>
			<span className="sr-only" role="status" aria-live="polite">
				{pending ? pendingMessage : ""}
			</span>
			{children}
		</div>
	);
}
