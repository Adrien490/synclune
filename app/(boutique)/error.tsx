"use client";

import { StorefrontErrorLayout } from "@/shared/components/storefront-error-layout";
import type { ErrorPageProps } from "@/shared/types/error.types";

export default function BoutiqueError({ error, reset }: ErrorPageProps) {
	return (
		<StorefrontErrorLayout
			emoji="🌙"
			title="Oups, un petit souci technique"
			description="Ne vous inquiétez pas, ce n'est pas de votre faute ! Réessayez dans quelques instants ou retournez à l'accueil."
			reset={reset}
			secondaryLabel="Retour à l'accueil"
			secondaryHref="/"
			digest={error.digest}
			showContactLink
		/>
	);
}
