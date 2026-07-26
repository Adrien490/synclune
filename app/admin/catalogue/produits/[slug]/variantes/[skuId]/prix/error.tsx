"use client";

import { AdminFormErrorBoundary } from "@/app/admin/_components/admin-form-error-boundary";
import { useSkuFormBackHref } from "@/app/admin/catalogue/produits/[slug]/variantes/[skuId]/_hooks/use-sku-form-back-href";

export default function SkuPriceFormError(props: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const backHref = useSkuFormBackHref();

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
