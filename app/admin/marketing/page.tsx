import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Marketing - Administration",
	description: "Gérer les campagnes marketing et promotions",
};

export default function MarketingPage() {
	return (
		<SectionNavigation
			title="Marketing"
			description="Section marketing (fonctionnalités à venir)"
			columns={1}
			links={[]}
		/>
	);
}
