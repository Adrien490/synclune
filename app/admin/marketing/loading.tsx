import { SectionNavigationLoading } from "@/app/admin/_components/section-navigation-loading";

export default function MarketingLoading() {
	return (
		<SectionNavigationLoading
			title="Marketing"
			description="Gérez vos codes promo"
			columns={2}
			count={2}
		/>
	);
}
