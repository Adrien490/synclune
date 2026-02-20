import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Mail, MessageSquare, Sparkles, Ticket } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Marketing - Administration",
	description: "Gérer les campagnes marketing et promotions",
};

export default function MarketingPage() {
	return (
		<SectionNavigation
			title="Marketing"
			description="Gérez vos codes promo, avis clients, personnalisations et newsletter"
			columns={2}
			links={[
				{
					title: "Codes promo",
					description: "Gérer les codes de réduction",
					href: "/admin/marketing/discounts",
					icon: Ticket,
				},
				{
					title: "Avis clients",
					description: "Gérer les avis et témoignages",
					href: "/admin/marketing/avis",
					icon: MessageSquare,
				},
				{
					title: "Personnalisations",
					description: "Gérer les demandes de personnalisation",
					href: "/admin/marketing/personnalisations",
					icon: Sparkles,
				},
				{
					title: "Newsletter",
					description: "Gérer les abonnés et campagnes",
					href: "/admin/marketing/newsletter",
					icon: Mail,
				},
			]}
		/>
	);
}
