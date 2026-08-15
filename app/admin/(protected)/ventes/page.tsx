import { SectionNavigation } from "@/app/admin/(protected)/_components/section-navigation";
import { ShoppingBagIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Ventes - Administration",
	description: "Gérer les commandes",
};

/**
 * Migration lean (lot 2) : Remboursements et Facturation ont quitté le hub —
 * la rétractation revient au lot 5 (`RetractationRequest`), la facturation
 * séquentielle Int au lot 4.
 */
export default async function VentesPage() {
	await assertAdminPage();

	return (
		<SectionNavigation
			title="Ventes"
			description="Gérez vos commandes"
			columns={1}
			links={[
				{
					title: "Commandes",
					description: "Suivre et gérer les commandes clients",
					href: "/admin/ventes/commandes",
					icon: <ShoppingBagIcon className="size-5" />,
				},
			]}
		/>
	);
}
