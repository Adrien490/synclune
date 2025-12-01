import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Percent } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Marketing - Administration",
	description: "Gérer les campagnes marketing et promotions",
};

export default function MarketingPage() {
	return (
		<SectionNavigation
			title="Marketing"
			description="Gérez vos codes promotionnels"
			columns={1}
			links={[
				{
					title: "Codes promo",
					description: "Créer et gérer les codes de réduction",
					href: "/admin/marketing/codes-promo",
					icon: Percent,
				},
			]}
		/>
	);
}
