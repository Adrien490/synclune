import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { HelpCircle, Megaphone } from "lucide-react";
import { type Metadata } from "next";
import { connection } from "next/server";

export const metadata: Metadata = {
	title: "Contenu - Administration",
	description: "Gérer le contenu du site",
};

export default async function ContentPage() {
	await connection();
	return (
		<SectionNavigation
			title="Contenu"
			description="Gérez le contenu affiché sur votre boutique"
			columns={2}
			links={[
				{
					title: "Annonces",
					description: "Gérer les annonces promotionnelles affichées sur la boutique",
					href: "/admin/contenu/annonces",
					icon: Megaphone,
				},
				{
					title: "FAQ",
					description: "Gérer les questions fréquentes affichées sur la homepage",
					href: "/admin/contenu/faq",
					icon: HelpCircle,
				},
			]}
		/>
	);
}
