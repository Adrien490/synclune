import { SectionNavigation } from "@/app/admin/_components/section-navigation";
import { Store } from "lucide-react";
import { type Metadata } from "next";

export const metadata: Metadata = {
	title: "Configuration - Administration",
	description: "Paramètres de la boutique",
};

export default function ConfigurationPage() {
	return (
		<SectionNavigation
			title="Configuration"
			description="Paramètres globaux de votre boutique"
			columns={2}
			links={[
				{
					title: "Boutique",
					description: "Fermeture temporaire, messages clients",
					href: "/admin/configuration/boutique",
					icon: <Store className="size-5" />,
				},
			]}
		/>
	);
}
