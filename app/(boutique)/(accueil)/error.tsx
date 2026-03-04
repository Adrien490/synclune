"use client";

import { StorefrontErrorLayout } from "@/shared/components/storefront-error-layout";
import type { ErrorPageProps } from "@/shared/types/error.types";

export default function HomeError({ error, reset }: ErrorPageProps) {
	return (
		<StorefrontErrorLayout
			emoji="🌙"
			title="Oups, un petit souci technique"
			description="Impossible de charger la page d'accueil. Réessayez dans quelques instants ou retournez à la boutique."
			reset={reset}
			secondaryLabel="Voir les créations"
			secondaryHref="/produits"
			digest={error.digest}
		/>
	);
}
