import type { ReactNode } from "react";

interface EspaceClientLayoutProps {
	children: ReactNode;
}

/**
 * Layout pour l'espace client
 * - Chaque page gère son propre header et navigation
 */
export default function EspaceClientLayout({
	children,
}: EspaceClientLayoutProps) {
	return children;
}
