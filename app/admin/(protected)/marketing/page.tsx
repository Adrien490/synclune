import { SectionNavigation } from "@/app/admin/(protected)/_components/section-navigation";
import { TicketIcon } from "@phosphor-icons/react/ssr";
import { type Metadata } from "next";
import { assertAdminPage } from "@/modules/admin-auth/lib/assert-admin-page";

export const metadata: Metadata = {
	title: "Marketing - Administration",
	description: "Gérer les campagnes marketing et promotions",
};

export default async function MarketingPage() {
	await assertAdminPage();

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
					icon: <TicketIcon className="size-5" />,
				},
			]}
		/>
	);
}
