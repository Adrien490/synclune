"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/shared/components/ui/breadcrumb";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
	generateBreadcrumbs,
	MAX_VISIBLE_SEGMENTS,
	type BreadcrumbSegment,
} from "./generate-breadcrumbs";

/**
 * Breadcrumb dynamique pour le dashboard admin (desktop uniquement).
 * Rendu dans `DashboardHeader` ; le mobile a son propre header via `AdminMobileHeader`
 * qui consomme `generateBreadcrumbs()` pour afficher uniquement title + parent.
 *
 * **Collapse** : si plus de 4 segments, les segments intermédiaires sont masqués
 * derrière un dropdown ellipsis. Le premier segment (Tableau de bord) et les 2
 * derniers restent toujours visibles.
 */
export function DashboardBreadcrumb() {
	const pathname = usePathname();
	const breadcrumbs = generateBreadcrumbs(pathname);

	const shouldCollapse = breadcrumbs.length > MAX_VISIBLE_SEGMENTS;

	let visibleSegments: BreadcrumbSegment[];
	let collapsedSegments: BreadcrumbSegment[] = [];

	if (shouldCollapse) {
		visibleSegments = [breadcrumbs[0]!, ...breadcrumbs.slice(-2)];
		collapsedSegments = breadcrumbs.slice(1, -2);
	} else {
		visibleSegments = breadcrumbs;
	}

	return (
		<Breadcrumb className="min-w-0" aria-label="Fil d'Ariane">
			<BreadcrumbList className="flex-nowrap">
				{/* Premier segment (Tableau de bord) */}
				<BreadcrumbItem className="shrink-0">
					{visibleSegments[0]!.isCurrentPage ? (
						<BreadcrumbPage title={visibleSegments[0]!.label}>
							{visibleSegments[0]!.label}
						</BreadcrumbPage>
					) : (
						<BreadcrumbLink href={visibleSegments[0]!.href} title={visibleSegments[0]!.label}>
							{visibleSegments[0]!.label}
						</BreadcrumbLink>
					)}
				</BreadcrumbItem>

				{/* Segments collapsés avec dropdown */}
				{shouldCollapse && collapsedSegments.length > 0 && (
					<>
						<BreadcrumbSeparator className="shrink-0" />
						<BreadcrumbItem className="shrink-0">
							<DropdownMenu>
								<DropdownMenuTrigger
									className="hover:text-foreground focus-ring inline-flex items-center gap-1 rounded-sm px-1 transition-colors"
									aria-label="Afficher plus de segments"
								>
									<Ellipsis className="size-4" />
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									{collapsedSegments.map((segment) => (
										<DropdownMenuItem key={segment.href} asChild>
											<Link href={segment.href}>{segment.label}</Link>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</BreadcrumbItem>
					</>
				)}

				{/* Segments visibles restants (sans le premier) */}
				{visibleSegments.slice(1).map((segment) => (
					<Fragment key={segment.href}>
						<BreadcrumbSeparator className="shrink-0" />
						<BreadcrumbItem className="min-w-0">
							{segment.isCurrentPage ? (
								<BreadcrumbPage className="truncate md:max-w-45" title={segment.label}>
									{segment.label}
								</BreadcrumbPage>
							) : (
								<BreadcrumbLink
									href={segment.href}
									className="truncate md:max-w-35"
									title={segment.label}
								>
									{segment.label}
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
					</Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
