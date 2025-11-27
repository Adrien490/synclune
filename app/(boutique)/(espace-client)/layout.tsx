import { getSession } from "@/shared/utils/get-session";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface EspaceClientLayoutProps {
	children: ReactNode;
}

/**
 * Layout protégé pour l'espace client
 * Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 */
export default async function EspaceClientLayout({
	children,
}: EspaceClientLayoutProps) {
	const session = await getSession();

	if (!session?.user) {
		redirect("/connexion?callbackUrl=/compte");
	}

	return <>{children}</>;
}
