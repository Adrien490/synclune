import { Suspense } from "react";
import type { Metadata } from "next";
import { EspaceClientContent } from "./_components/espace-client-content";

export const metadata: Metadata = {
	title: {
		template: "%s | Mon compte | Synclune",
		default: "Mon compte | Synclune",
	},
	robots: { index: false, follow: false },
};

export default function EspaceClientLayout({ children }: { children: React.ReactNode }) {
	return (
		<Suspense>
			<EspaceClientContent>{children}</EspaceClientContent>
		</Suspense>
	);
}
