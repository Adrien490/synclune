import { UserDropdown } from "@/app/admin/_components/user-dropdown";
import { DashboardBreadcrumb } from "@/app/admin/_components/dashboard-breadcrumb";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { SidebarTrigger } from "@/shared/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ChangelogDialog } from "@/modules/dashboard/components/changelog-dialog/changelog-dialog";
import { ChangelogDialogSkeleton } from "@/modules/dashboard/components/changelog-dialog/changelog-dialog-skeleton";

interface DashboardHeaderProps {
	user?: {
		name: string;
		email: string;
		avatar?: string;
	};
}

/**
 * Header du dashboard (Server Component)
 * Utilise Suspense pour le chargement streaming du changelog
 */
export function DashboardHeader({ user }: DashboardHeaderProps) {
	return (
		<header
			className="relative flex h-14 md:h-16 shrink-0 items-center gap-2 justify-between transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-border"
			role="banner"
			aria-label="En-tête du tableau de bord"
		>
			<div className="flex items-center gap-2 px-4 flex-1 min-w-0">
				{/* Toggle sidebar avec raccourci clavier */}
				<Tooltip>
					<TooltipTrigger asChild>
						<SidebarTrigger className="-ml-1 shrink-0" />
					</TooltipTrigger>
					<TooltipContent side="right" sideOffset={8}>
						<span>Basculer le menu</span>
						<kbd className="ml-2 inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
							<span className="text-xs">⌘</span>B
						</kbd>
					</TooltipContent>
				</Tooltip>
				<Separator
					orientation="vertical"
					className="mr-2 h-4 data-[orientation=vertical]:h-4 shrink-0"
				/>
				{/* Breadcrumb dynamique - amélioré pour mobile */}
				<div className="min-w-0 flex-1">
					<DashboardBreadcrumb />
				</div>
			</div>

			<div className="flex items-center gap-2 px-4 shrink-0 justify-end">
				{/* Bouton Voir le site */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="h-9 gap-2"
							asChild
						>
							<Link href="/" target="_blank" rel="noopener noreferrer">
								<ExternalLink className="h-4 w-4" aria-hidden="true" />
								<span className="hidden sm:inline">Voir le site</span>
								<span className="sr-only sm:hidden">Voir le site</span>
							</Link>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="sm:hidden">
						Voir le site
					</TooltipContent>
				</Tooltip>

				{/* Changelog */}
				<Suspense fallback={<ChangelogDialogSkeleton />}>
					<ChangelogDialog />
				</Suspense>

				{/* User dropdown */}
				{user && <UserDropdown user={user} />}
			</div>
		</header>
	);
}
