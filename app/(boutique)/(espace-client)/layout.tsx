import { AccountNav } from "@/modules/users/components/account-nav";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: {
		template: "%s | Mon compte | Synclune",
		default: "Mon compte | Synclune",
	},
	robots: { index: false },
};

export default function EspaceClientLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-6 lg:pb-10">
			<div className="lg:flex lg:gap-10">
				<AccountNav />
				<div className="flex-1 min-w-0">{children}</div>
			</div>
		</div>
	);
}
