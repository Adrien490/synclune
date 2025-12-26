"use client";

import { Button } from "@/shared/components/ui/button";
import { useEffect } from "react";

/**
 * Bouton de rechargement + détection automatique du retour en ligne
 * Recharge automatiquement la page quand la connexion est rétablie
 */
export function OfflineActions() {
	useEffect(() => {
		const handleOnline = () => {
			window.location.reload();
		};

		window.addEventListener("online", handleOnline);
		return () => window.removeEventListener("online", handleOnline);
	}, []);

	return (
		<Button size="lg" onClick={() => window.location.reload()}>
			Réessayer
		</Button>
	);
}
