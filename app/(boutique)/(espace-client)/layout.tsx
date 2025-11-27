import { AccountNav } from "@/modules/users/components/account-nav";
import type { ReactNode } from "react";

interface EspaceClientLayoutProps {
	children: ReactNode;
}

/**
 * Layout protégé pour l'espace client
 * - Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 * - Fournit la navigation mobile (bottom tabs) via AccountNav
 * - Chaque page gère son propre PageHeader et sidebar desktop
 */
export default async function EspaceClientLayout({
	children,
}: EspaceClientLayoutProps) {

	return (
		<>
			{children}
			{/* Navigation mobile (bottom tabs) - Gérée au niveau layout */}
			<AccountNav variant="mobile-only" />
		</>
	);
}
