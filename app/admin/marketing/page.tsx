import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { MessageSquare, Ticket } from "lucide-react";
import { type Metadata } from "next";

export const metadata: Metadata = {
	title: "Marketing - Administration",
	description: "Gérer les campagnes marketing et promotions",
};

export default function MarketingPage() {
	return (
		<SectionNavigation
			title="Marketing"
			description="Gérez vos codes promo et avis clients"
			columns={2}
			links={[
				{
					title: "Codes promo",
					description: "Gérer les codes de réduction",
					href: "/admin/marketing/discounts",
					icon: <Ticket className="h-5 w-5" />,
				},
				{
					title: "Avis clients",
					description: "Gérer les avis et témoignages",
					href: "/admin/marketing/avis",
					icon: <MessageSquare className="h-5 w-5" />,
				},
			]}
		/>
	);
}
