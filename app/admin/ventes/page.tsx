import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { ArrowsClockwiseIcon, BankIcon, ShoppingBagIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import { assertAdminPage } from "@/modules/auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Ventes - Administration",
	description: "Gérer les ventes, remboursements et facturation",
};

export default async function VentesPage() {
	await assertAdminPage();

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
					icon: <ShoppingBagIcon className="size-5" />,
				},
				{
					title: "Remboursements",
					description: "Gérer les demandes de remboursement",
					href: "/admin/ventes/remboursements",
					icon: <ArrowsClockwiseIcon className="size-5" />,
				},
				{
					title: "Facturation",
					// L'e-reporting DGFiP a été retiré du code le 2026-07-26 (right-sizing,
					// spec non figée + aucune Plateforme Agréée branchée) — cf. CLAUDE.md.
					description: "État de la facturation électronique et des avoirs",
					href: "/admin/ventes/facturation",
					icon: <BankIcon className="size-5" />,
				},
			]}
		/>
	);
}
