import { SectionNavigationLoading } from "@/app/admin/_components/section-navigation-loading";

export default function VentesLoading() {
	return (
		<SectionNavigationLoading
			title="Ventes"
			description="Gérez vos commandes et remboursements"
			columns={2}
			count={2}
		/>
	);
}
