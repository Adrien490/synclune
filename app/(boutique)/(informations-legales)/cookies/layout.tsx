import { Metadata } from "next";

export const metadata: Metadata = {
	title: "Gestion des cookies | Synclune",
	description:
		"Gérez vos préférences de cookies et consultez les informations sur les traceurs utilisés sur Synclune",
};

export default function CookiesLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
