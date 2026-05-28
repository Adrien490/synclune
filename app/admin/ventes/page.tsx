import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Landmark, RefreshCcw, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Ventes - Administration",
	description: "Gérer les ventes, remboursements et facturation",
};

export default function VentesPage() {
	return (
		<SectionNavigation
			title="Ventes"
			description="Gérez vos commandes, remboursements et état de facturation électronique"
			columns={3}
			links={[
				{
					title: "Commandes",
					description: "Suivre et gérer les commandes clients",
					href: "/admin/ventes/commandes",
					icon: <ShoppingCart className="size-5" />,
				},
				{
					title: "Remboursements",
					description: "Gérer les demandes de remboursement",
					href: "/admin/ventes/remboursements",
					icon: <RefreshCcw className="size-5" />,
				},
				{
					title: "Facturation",
					description: "État facturation électronique + e-reporting DGFiP",
					href: "/admin/ventes/facturation",
					icon: <Landmark className="size-5" />,
				},
			]}
		/>
	);
}
