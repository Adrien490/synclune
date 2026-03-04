"use client";

import { StorefrontErrorLayout } from "@/shared/components/storefront-error-layout";
import type { ErrorPageProps } from "@/shared/types/error.types";

export default function PersonnalisationError({ error, reset }: ErrorPageProps) {
	return (
		<StorefrontErrorLayout
			emoji="✨"
			title="Impossible de charger le formulaire"
			description="Le formulaire de personnalisation n'a pas pu être chargé. Réessayez dans quelques instants ou découvrez nos créations."
			reset={reset}
			secondaryLabel="Découvrir nos créations"
			secondaryHref="/produits"
			digest={error.digest}
		/>
	);
}
