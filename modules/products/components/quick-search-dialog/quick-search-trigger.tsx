"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";

import { useDialog } from "@/shared/providers/dialog-store-provider";
import { Button } from "@/shared/components/ui/button";
import { ShortcutKbd } from "@/shared/components/ui/shortcut-kbd";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { QUICK_SEARCH_DIALOG_ID } from "./constants";
import { lastTrigger } from "./last-trigger";

interface QuickSearchTriggerProps extends React.ComponentProps<"button"> {
	className?: string;
	ref?: React.Ref<HTMLButtonElement>;
	/**
	 * Visual variant.
	 * - `icon` (default): square icon button (used on mobile / compact navbars).
	 * - `bar`: square icon below `lg`, expanding into a "Rechercher … ⌘K" search
	 *   pill from `lg` up — surfaces the affordance and the shortcut persistently
	 *   on roomy desktop layouts.
	 */
	variant?: "icon" | "bar";
}

/**
 * Trigger button for the quick search dialog.
 */
export function QuickSearchTrigger({
	className,
	ref,
	variant = "icon",
	onClick,
	// Les props restantes sont propagées : sans elles, envelopper le déclencheur
	// dans un `TooltipTrigger render={…}` perdait en silence les gestionnaires et
	// les attributs ARIA que Base UI y injecte (l'infobulle ne s'ouvrait jamais).
	...props
}: QuickSearchTriggerProps) {
	const { open, isOpen } = useDialog(QUICK_SEARCH_DIALOG_ID);

	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		onClick?.(e);
		triggerHaptic("light");
		// Remember this button so focus can return to it when the dialog
		// closes (see `onCloseAutoFocus`), then blur it: Radix sets
		// aria-hidden on the header before focus moves to dialog content,
		// and a focused descendant would trigger a browser warning.
		lastTrigger.el = e.currentTarget;
		e.currentTarget.blur();
		open();
	};

	if (variant === "bar") {
		return (
			<button
				ref={ref}
				type="button"
				{...props}
				onClick={handleClick}
				aria-label="Ouvrir la recherche rapide"
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				// `aria-label` écrase le `<kbd>` : sans ceci, ⌘K n'est jamais annoncé.
				// `aria-keyshortcuts` est l'attribut dédié (annoncé par NVDA/JAWS/VO) et
				// évite de mettre un libellé dépendant de la plateforme dans le nom
				// accessible. Le badge visuel reste `lg`-only, faute de place à 44px.
				aria-keyshortcuts="Meta+K Control+K"
				className={cn(
					"group touch-manipulation transition-all duration-300 ease-out",
					// < lg : square icon button
					"text-muted-foreground inline-flex size-11 items-center justify-center rounded-xl",
					"can-hover:hover:bg-accent can-hover:hover:text-accent-foreground focus-ring",
					// lg+ : expand into a search bar pill
					"lg:border-input lg:bg-muted/40 lg:hover:bg-muted lg:hover:text-foreground lg:size-auto lg:h-9 lg:w-56 lg:justify-start lg:gap-2 lg:rounded-lg lg:border lg:px-3",
					className,
				)}
			>
				<MagnifyingGlassIcon className="size-5 shrink-0 lg:size-4" aria-hidden="true" />
				<span className="hidden flex-1 text-left text-sm lg:inline">Rechercher</span>
				<ShortcutKbd keyLabel="K" className="hidden lg:inline-flex" />
			</button>
		);
	}

	return (
		<Button
			ref={ref}
			variant="ghost"
			size="icon"
			{...props}
			onClick={handleClick}
			className={cn("size-11 touch-manipulation transition-all duration-300 ease-out", className)}
			aria-label="Ouvrir la recherche rapide"
			aria-expanded={isOpen}
			aria-haspopup="dialog"
			aria-keyshortcuts="Meta+K Control+K"
		>
			<MagnifyingGlassIcon className="size-5" />
		</Button>
	);
}
