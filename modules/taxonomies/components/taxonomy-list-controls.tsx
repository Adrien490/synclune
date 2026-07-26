"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { ActiveToggle } from "@/shared/components/active-toggle";
import { AdminSortBadge } from "@/shared/components/admin/admin-sort-badge";
import { RefreshButton } from "@/shared/components/refresh-button";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import type { TaxonomyConfig } from "../types/taxonomy.types";

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

export function TaxonomySortBadge({ config }: { config: TaxonomyConfig }) {
	return <AdminSortBadge sortLabels={config.sortLabels} defaultSort={config.defaultSort} />;
}

// ============================================================================
// BOUTON DE CRÉATION
// ============================================================================

/**
 * Sur mobile on navigue vers la page dédiée (le dialog est trop à l'étroit) ;
 * sur desktop on ouvre le dialog de formulaire.
 */
export function CreateTaxonomyButton({ config }: { config: TaxonomyConfig }) {
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
