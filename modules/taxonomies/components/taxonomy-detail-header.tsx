"use client";

import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { DotsThreeIcon, PencilSimpleIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";

import {
	ResponsiveActionMenu,
	ResponsiveActionMenuContent,
	ResponsiveActionMenuTrigger,
	type ActionMenuSection,
} from "@/shared/components/responsive-action-menu";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";

import { agree } from "../config/taxonomy.config";
import type { TaxonomyConfig } from "../types/taxonomy.types";
import { DetailStickyActionBar } from "@/shared/components/admin/detail-sticky-action-bar";
import { DetailHeaderShell } from "@/shared/components/admin/detail-header-shell";

interface TaxonomyDetailHeaderProps {
	config: TaxonomyConfig;
	id: string;
	displayName: string;
	isActive: boolean;
	slug: string;
	createdAt: Date;
	updatedAt: Date;
	/** Menu d'actions de l'entité, construit par son hook `use*Actions`. */
	sections: ActionMenuSection[];
	/**
	 * Visuel de tête : la pastille d'une couleur, l'icône d'un matériau ou d'un
	 * type. C'est le seul écart de rendu entre les trois en-têtes.
	 */
	visual: ReactNode;
	/** Badges additionnels après le statut (ex. « Système » pour un type verrouillé). */
	extraBadges?: ReactNode;
	/** Verrouille l'édition (types de bijoux système). */
	editDisabled?: boolean;
}

/**
 * En-tête des pages détail de taxonomies : visuel, titre, badge de statut,
 * dates, bouton « Modifier » et menu d'actions.
 *
 * Tous les accords de genre (« Créée » / « Créé », « Active » / « Actif »)
 * viennent du registre.
 */
export function TaxonomyDetailHeader({
	config,
	id,
	displayName,
	isActive,
	slug,
	createdAt,
	updatedAt,
	sections,
	visual,
	extraBadges,
	editDisabled = false,
}: TaxonomyDetailHeaderProps) {
	const haptic = useHaptic();
	const created = agree(config, "Créé");
	const updated = agree(config, "mis") + " à jour";

	return (
		<DetailHeaderShell>
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-3">
					{visual}
					<h1 className="font-display text-foreground text-xl leading-tight font-normal tracking-normal sm:text-3xl lg:text-4xl">
						{displayName}
					</h1>
				</div>
				<div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs md:hidden">
					<Badge
						variant={isActive ? "default" : "secondary"}
						className="shrink-0"
						style={{ viewTransitionName: `${config.kind}-status-${id}` }}
					>
						{isActive ? agree(config, "Actif") : agree(config, "Inactif")}
					</Badge>
					{extraBadges}
					<span aria-hidden="true">·</span>
					<span className="truncate">
						{created} {formatDistanceToNow(createdAt, { addSuffix: true, locale: fr })}
					</span>
				</div>
				<p className="text-muted-foreground mt-1 hidden text-sm md:block">
					{created} le {format(createdAt, "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
					<span className="text-muted-foreground">
						{" "}
						({updated} {formatDistanceToNow(updatedAt, { addSuffix: true, locale: fr })})
					</span>
				</p>
			</div>

			<DetailStickyActionBar>
				<Button
					render={
						<Link
							href={editDisabled ? "#" : `${config.basePath}/${slug}/modifier`}
							aria-disabled={editDisabled || undefined}
							onClick={(event) => {
								if (editDisabled) {
									event.preventDefault();
									return;
								}
								haptic("light");
							}}
						/>
					}
					size="sm"
					className="min-h-11 flex-1 touch-manipulation transition-transform duration-150 active:scale-[0.98] sm:min-h-9 md:flex-none"
					disabled={editDisabled}
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
