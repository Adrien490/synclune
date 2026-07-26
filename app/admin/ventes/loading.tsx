import { SectionNavigationLoading } from "@/app/admin/_components/section-navigation-loading";

export default function VentesLoading() {
	return (
		/*
		 * `columns` et `count` doivent suivre `app/admin/ventes/page.tsx` : la page
		 * rend `columns={3}` et **3** liens (Commandes / Remboursements / Facturation).
		 * À 2/2, la grille passait de `md:grid-cols-2` à `md:grid-cols-2 lg:grid-cols-3`
		 * et de 2 à 3 cartes au rendu réel — reflow complet de la rangée à `lg`, et une
		 * rangée supplémentaire à `md`.
		 *
		 * La description est aussi alignée : `SectionNavigationLoading` ne réserve
		 * qu'une ligne (`h-4 w-72`) pour la description mobile, donc un texte plus long
		 * que celui-ci passerait sur deux lignes au rendu réel.
		 */
		<SectionNavigationLoading
			title="Ventes"
			description="Gérez vos commandes, remboursements et état de facturation électronique"
			columns={3}
			count={3}
		/>
	);
}
