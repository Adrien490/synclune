"use client";

import { FilterX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { triggerHaptic } from "@/shared/hooks/use-haptic";

interface EmptyResetFiltersActionProps {
	/** Pathname de la liste sans aucun filtre (ex: "/admin/catalogue/produits"). */
	href: string;
	/** Label du bouton. */
	label?: string;
}

/**
 * CTA "Réinitialiser les filtres" affichée dans un empty state mobile/desktop
 * quand `hasActiveFilters === true`. Navigue vers la route nue (clear tous params)
 * avec haptic feedback.
 */
export function EmptyResetFiltersAction({
	href,
	label = "Réinitialiser les filtres",
}: EmptyResetFiltersActionProps) {
	return (
		<Button asChild variant="outline">
			<Link
				href={href}
				onClick={() => {
					triggerHaptic("light");
				}}
			>
				<FilterX aria-hidden="true" />
				{label}
			</Link>
		</Button>
	);
}
