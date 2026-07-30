import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Ticket } from "lucide-react";
import { type Metadata } from "next";

export const metadata: Metadata = {
	title: "Marketing - Administration",
	description: "Gérer les campagnes marketing et promotions",
};

export default function MarketingPage() {
	return (
		<SectionNavigation
			title="Marketing"
			description="Gérez vos codes promo"
			columns={2}
			links={[
				{
					title: "Codes promo",
					description: "Gérer les codes de réduction",
					href: "/admin/marketing/discounts",
					icon: <Ticket className="size-5" />,
				},
			]}
		/>
	);
}
