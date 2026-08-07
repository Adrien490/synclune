"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { ActiveToggle } from "@/shared/components/active-toggle";
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
 */

// ============================================================================
// CHIP DE TRI (mobile)
// ============================================================================

/**
 * ⚠️ Prend un `kind` (chaîne), pas l'objet `config`.
 *
 * Ce composant est `"use client"` et monté depuis des Server Components : un
 * `TaxonomyConfig` passé en prop traverserait la frontière RSC — ~40 champs
 * sérialisés à chaque rendu, pour une valeur que le client peut lire seul dans
 * le registre. Le `kind` fait cinq caractères sur le fil.
 *
 * C'est aussi ce qui a permis de supprimer les fichiers-liants d'un composant
 * (`colors-bottom-bar.tsx` et ses quatorze jumeaux, 8 à 13 lignes chacun) dont
 * le corps entier était `return <Taxonomy… config={TAXONOMY_CONFIG.x} />`.
 */
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

// ============================================================================
// BASCULE « ACTIF »
// ============================================================================

interface TaxonomyActiveToggleProps {
	id: string;
	isActive: boolean;
	toggleStatus: (id: string, isActive: boolean) => void;
	isPending: boolean;
	/** Verrouille la bascule (types de bijoux système, non modifiables). */
	disabled?: boolean;
}

/**
 * `useOptimistic` + `startTransition` maison : l'état optimiste doit survivre
 * jusqu'à la résolution de l'action, d'où le `startTransition` ici plutôt que
 * dans le hook de mutation.
 */
export function TaxonomyActiveToggle({
	id,
	isActive,
	toggleStatus,
	isPending,
	disabled = false,
}: TaxonomyActiveToggleProps) {
	const [optimisticIsActive, setOptimisticIsActive] = useOptimistic(isActive);
	const [isTransitionPending, startTransition] = useTransition();

	const handleToggle = (checked: boolean) => {
		startTransition(() => {
			setOptimisticIsActive(checked);
			toggleStatus(id, checked);
		});
	};

	return (
		<ActiveToggle
			isActive={optimisticIsActive}
			onToggle={handleToggle}
			isPending={isPending || isTransitionPending}
			disabled={disabled}
		/>
	);
}
