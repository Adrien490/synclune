import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { RefreshCcw, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Ventes - Administration",
	description: "Gérer les ventes et remboursements",
};

export default function VentesPage() {
	return (
		<SectionNavigation
			title="Ventes"
			description="Gérez vos commandes et remboursements"
			columns={2}
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
			]}
		/>
	);
}
