"use client";

import { DotsThreeIcon, PencilSimpleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";

import type { TaxonomyConfig } from "../types/taxonomy.types";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface TaxonomyDetailHeaderProps {
	config: TaxonomyConfig;
	id: string;
	displayName: string;
	/** Menu d'actions de l'entité, construit par son hook `use*Actions`. */
	sections: ActionMenuSection[];
	/**
	 * Visuel de tête : la pastille d'une couleur ou l'icône d'un matériau.
	 * C'est le seul écart de rendu entre les en-têtes.
	 */
	visual: ReactNode;
	/** Badges additionnels après le titre. */
	extraBadges?: ReactNode;
}

/**
 * En-tête des pages détail de taxonomies : visuel, titre, bouton « Modifier »
 * et menu d'actions.
 *
 * Schéma lean (lot 2) : plus de statut actif ni de dates sur Color/Material —
 * l'en-tête se réduit au titre et aux actions ; l'édition est routée par id.
 */
export function TaxonomyDetailHeader({
	config,
	id,
	displayName,
	sections,
	visual,
	extraBadges,
}: TaxonomyDetailHeaderProps) {
	const haptic = useHaptic();

	return (
		<DetailHeaderShell>
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-3">
					{visual}
					<h1 className="font-display text-foreground text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
						{displayName}
					</h1>
					{extraBadges}
				</div>
			</div>

			<DetailStickyActionBar>
				<Button
					render={
						<Link
							href={`${config.basePath}/${id}/modifier`}
							onClick={() => {
								haptic("light");
							}}
						/>
					}
					size="sm"
					className="min-h-11 flex-1 touch-manipulation transition-transform duration-150 active:scale-[0.98] sm:min-h-9 md:flex-none"
				>
					<PencilSimpleIcon className="size-4" aria-hidden="true" />
					Modifier
				</Button>

				<ResponsiveActionMenu>
					<ResponsiveActionMenuTrigger
						render={
							<Button
								variant="outline"
								size="sm"
								aria-label="Plus d'actions"
								className="min-h-11 min-w-11 touch-manipulation sm:min-h-9 sm:min-w-9"
							/>
						}
					>
						<DotsThreeIcon className="size-4" aria-hidden="true" />
					</ResponsiveActionMenuTrigger>
					<ResponsiveActionMenuContent
						title={`Actions ${config.labels.singular}`}
						description={displayName}
						sections={sections}
					/>
				</ResponsiveActionMenu>
			</DetailStickyActionBar>
		</DetailHeaderShell>
	);
}
