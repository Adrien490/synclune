import { redirect } from "next/navigation";

type BijouxTypePageProps = {
	params: Promise<{ productTypeSlug: string }>;
};

/**
 * Page /produits/[productTypeSlug]
 *
 * Redirige vers /produits?type=[slug] pour maintenir la compatibilité
 * avec les anciennes URLs (SEO: redirection 301 permanente)
 */
export default async function BijouxTypePage({ params }: BijouxTypePageProps) {
	const { productTypeSlug } = await params;
	redirect(`/produits?type=${productTypeSlug}`);
}
