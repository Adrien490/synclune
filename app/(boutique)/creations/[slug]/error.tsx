"use client";

import { StorefrontErrorLayout } from "@/shared/components/storefront-error-layout";
import type { ErrorPageProps } from "@/shared/types/error.types";

export default function ProductError({ error, reset }: ErrorPageProps) {
	return (
		<StorefrontErrorLayout
			emoji="💎"
			title="Impossible de charger ce produit"
			description="Ce bijou joue les timides ! Réessayez dans quelques instants ou découvrez nos autres créations."
			reset={reset}
			secondaryLabel="Voir toutes les créations"
			secondaryHref="/creations"
			digest={error.digest}
		/>
	);
}
