import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/urls";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Page introuvable - Administration",
	robots: { index: false, follow: false },
};

/**
 * 404 de l'administration.
 *
 * Un seul fichier à la racine `app/admin/` couvre tout le sous-arbre. Sans lui,
 * `notFound()` — atteignable sur **chaque** route de détail `[slug]`/`[id]` —
 * tombait sur `app/not-found.tsx`, stylé storefront, avec des CTA vers `/` et
 * `/produits` : l'admin perdait son shell, sa sidebar et sa navigation.
 *
 * Rendu dans le `<main>` de `app/admin/layout.tsx` : pas de `<main>` ici, et on
 * reprend la coquille visuelle des frontières d'erreur admin
 * (`admin-list-error-boundary.tsx`) pour rester homogène.
 */
export default function AdminNotFound() {
	return (
		<div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
			<p className="text-muted-foreground/30 text-6xl" aria-hidden="true">
				🧭
			</p>
			<h2 className="font-display text-foreground text-xl font-normal">
				<span className="sr-only">Erreur 404 : </span>
				Cette page n&apos;existe pas
			</h2>
			<p className="text-muted-foreground max-w-md text-sm">
				L&apos;élément a peut-être été supprimé, ou son adresse a changé.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-2">
				<Button asChild>
					<Link href={ROUTES.ADMIN.DASHBOARD}>Retour au tableau de bord</Link>
				</Button>
			</div>
		</div>
	);
}
