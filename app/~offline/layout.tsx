import { inter, cormorantGaramond } from "@/shared/styles/fonts";
import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
	title: {
		template: "%s | Synclune",
		default: "Hors ligne | Synclune",
	},
	robots: { index: false, follow: false },
};

export default function OfflineLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="fr">
			<body
				className={`${inter.variable} ${inter.className} ${cormorantGaramond.variable} antialiased`}
			>
				{children}
			</body>
		</html>
	);
}
