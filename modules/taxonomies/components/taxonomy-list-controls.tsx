"use client";

import { useRouter } from "next/navigation";

import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";
import { RefreshButton } from "@/shared/components/refresh-button";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/overlay-store-provider";

import { TAXONOMY_CONFIG } from "../config/taxonomy.config";
import type { TaxonomyConfig, TaxonomyKind } from "../types/taxonomy.types";

/**
 * Contrôles de liste partagés par les trois taxonomies.
 *
 * Chaque module expose un composant nommé qui délègue ici en passant sa
 * configuration — les pages admin gardent des noms explicites
 * (`ColorsSortBadge`, `CreateMaterialButton`…) tout en partageant le corps.
 *
 * Les composants qui prennent un `kind` plutôt qu'un `config` le font pour la
 * raison exposée sur `TaxonomyKind` (frontière RSC).
 */

// ============================================================================
// CHIP DE TRI (mobile)
// ============================================================================

export function TaxonomySortBadge({ kind }: { kind: TaxonomyKind }) {
	const config = TAXONOMY_CONFIG[kind];
	return <AdminSortBadge sortLabels={config.sortLabels} defaultSort={config.defaultSort} />;
}

// ============================================================================
// BOUTON DE CRÉATION
// ============================================================================

/**
 * Sur mobile on navigue vers la page dédiée (le dialog est trop à l'étroit) ;
 * sur desktop on ouvre le dialog de formulaire.
 */
export function CreateTaxonomyButton({ kind }: { kind: TaxonomyKind }) {
	const config = TAXONOMY_CONFIG[kind];
	const { open } = useDialog(config.formDialogId);
	const isMobile = useIsMobile();
	const router = useRouter();

	const handleClick = () => {
		if (isMobile) {
			router.push(`${config.basePath}/nouveau`);
		} else {
			open();
		}
	};

	return <Button onClick={handleClick}>{config.createButtonLabel}</Button>;
}

// ============================================================================
// BOUTON DE RAFRAÎCHISSEMENT
// ============================================================================

interface RefreshTaxonomyButtonProps {
	config: TaxonomyConfig;
	refresh: () => void;
	isPending: boolean;
	className?: string;
	variant?: "outline" | "ghost" | "secondary";
}

export function RefreshTaxonomyButton({
	config,
	refresh,
	isPending,
	className,
	variant = "outline",
}: RefreshTaxonomyButtonProps) {
	return (
		<RefreshButton
			onRefresh={refresh}
			isPending={isPending}
			label={`Rafraîchir ${config.labels.plural}`}
			className={className}
			variant={variant}
		/>
	);
}
