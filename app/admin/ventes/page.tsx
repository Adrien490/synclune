import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { CreditCard, RefreshCcw, ShoppingCart } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ventes - Administration",
  description: "Gérer les ventes, commandes et paiements",
};

export default function VentesPage() {
	return (
		<SectionNavigation
			title="Ventes"
			description="Gérez vos commandes, paiements et remboursements"
			columns={3}
			links={[
				{
					title: "Commandes",
					description: "Suivre et gérer les commandes clients",
					href: "/admin/ventes/commandes",
					icon: ShoppingCart,
				},
				{
					title: "Paiements",
					description: "Consulter les paiements Stripe",
					href: "/admin/ventes/paiements",
					icon: CreditCard,
				},
				{
					title: "Remboursements",
					description: "Gérer les demandes de remboursement",
					href: "/admin/ventes/remboursements",
					icon: RefreshCcw,
				},
			]}
		/>
	);
}
