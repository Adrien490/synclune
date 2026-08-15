import { SectionNavigation } from "@/app/admin/(protected)/_components/section-navigation";
import { ArrowUUpLeftIcon, ShoppingBagIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Ventes - Administration",
	description: "Gérer les commandes",
};

export default async function VentesPage() {
	await assertAdminPage();

	return (
		<SectionNavigation
			title="Ventes"
			description="Gérez vos commandes"
			columns={2}
			links={[
				{
					title: "Commandes",
					description: "Suivre et gérer les commandes clients",
					href: "/admin/ventes/commandes",
					icon: <ShoppingBagIcon className="size-5" />,
				},
				{
					title: "Rétractations",
					description: "Traiter les demandes de rétractation (remboursements)",
					href: "/admin/ventes/retractations",
					icon: <ArrowUUpLeftIcon className="size-5" />,
				},
			]}
		/>
	);
}
