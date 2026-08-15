"use client";

import { AdminFormErrorBoundary } from "@/app/admin/(protected)/_components/admin-form-error-boundary";
import { useVariantFormBackHref } from "@/app/admin/(protected)/catalogue/produits/[slug]/variantes/[variantId]/_hooks/use-variant-form-back-href";

export default function VariantPriceFormError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const backHref = useVariantFormBackHref();

	return (
		<AdminFormErrorBoundary
			{...props}
			title="Le formulaire de prix n'a pas pu charger"
			route="admin.catalogue.produits.variantes.prix"
			backHref={backHref}
			backLabel="Retour à la variante"
		/>
	);
}
