"use client";

import { DashboardBreadcrumb } from "@/app/admin/_components/dashboard-breadcrumb";
import { KEYBOARD_SHORTCUTS_DIALOG_ID } from "@/app/admin/_components/keyboard-shortcuts.constants";
import { Separator } from "@/shared/components/ui/separator";
import { Kbd, KbdGroup } from "@/shared/components/ui/kbd";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { ArrowSquareOutIcon, KeyboardIcon } from "@phosphor-icons/react/ssr";
// GuardedLink : consulte le registre de NavigationGuardProvider avant de naviguer,
// pour ne pas perdre la saisie d'un formulaire admin dirty (cf. audit 2026-07-26).
import { GuardedLink as Link } from "@/shared/components/navigation/guarded-link";

const iconButtonClass = cn(
	"inline-flex size-8 shrink-0 items-center justify-center rounded-md",
	"text-muted-foreground can-hover:hover:bg-accent can-hover:hover:text-accent-foreground",
	"motion-safe:transition-colors focus-ring",
);

/**
 * Header desktop du dashboard admin (`md:flex`, sibling de `AdminMobileHeader`).
 *
 * Rendus :
 * - `SidebarTrigger` — toggle sidebar (raccourci ⌘B bindé dans `SidebarProvider`).
 * - `DashboardBreadcrumb` — fil d'Ariane (desktop uniquement).
 * - Bouton "Raccourcis clavier" — ouvre `KeyboardShortcutsDialog` (touche `?` bindée
 *   dans le dialog, ce bouton sert d'affordance visuelle).
 * - Lien externe vers le site (`target="_blank"`).
 */
export function DashboardHeader() {
	const { open: openShortcuts } = useDialog(KEYBOARD_SHORTCUTS_DIALOG_ID);

	return (
		<header
			className="border-border relative hidden h-14 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:flex md:h-16"
			aria-label="En-tête du tableau de bord"
		>
			<div className="flex min-w-0 flex-1 items-center gap-2 px-4">
				<Tooltip>
					<TooltipTrigger render={<SidebarTrigger className="-ml-1 shrink-0" />}></TooltipTrigger>
					<TooltipContent side="right" sideOffset={8}>
						<span>Basculer le menu</span>
						<KbdGroup className="ml-2">
							<Kbd>⌘</Kbd>
							<Kbd>B</Kbd>
						</KbdGroup>
					</TooltipContent>
				</Tooltip>
				<Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
				<div className="min-w-0 flex-1">
					<DashboardBreadcrumb />
				</div>
				<Tooltip>
					<TooltipTrigger
						render={
							<button
								type="button"
								onClick={() => openShortcuts()}
								className={iconButtonClass}
								aria-label="Afficher les raccourcis clavier"
							/>
						}
					>
						<KeyboardIcon className="size-4" aria-hidden="true" />
					</TooltipTrigger>
					<TooltipContent side="bottom">
						<span>Raccourcis clavier</span>
						<KbdGroup className="ml-2">
							<Kbd>?</Kbd>
						</KbdGroup>
					</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger
						render={
							<Link
								href="/"
								target="_blank"
								rel="noopener noreferrer"
								className={iconButtonClass}
								aria-label="Voir le site (nouvel onglet)"
							/>
						}
					>
						<ArrowSquareOutIcon className="size-4" aria-hidden="true" />
					</TooltipTrigger>
					<TooltipContent side="bottom">Voir le site</TooltipContent>
				</Tooltip>
			</div>
		</header>
	);
}
