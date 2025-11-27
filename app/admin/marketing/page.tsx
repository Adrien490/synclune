import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Mail, Percent } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Marketing - Administration",
	description: "Gérer les campagnes marketing et promotions",
};

export default function MarketingPage() {
	return (
		<SectionNavigation
			title="Marketing"
			description="Gérez vos newsletters et codes promotionnels"
			columns={2}
			links={[
				{
					title: "Newsletter",
					description: "Envoyer des emails et gérer les abonnés",
					href: "/admin/marketing/newsletter",
					icon: Mail,
				},
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
