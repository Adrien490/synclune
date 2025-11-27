"use client";

import { Button } from "@/shared/components/ui/button";
import { useState } from "react";

/**
 * Bouton de déconnexion pour le formulaire de checkout
 * Utilise une action directe sans formulaire imbriqué pour éviter les erreurs d'hydratation
 */
export function SignOutButton() {
	const [isPending, setIsPending] = useState(false);

	const handleSignOut = async () => {
		setIsPending(true);
		try {
			// Appel direct à l'API de déconnexion Better Auth
			const response = await fetch("/api/auth/sign-out", {
				method: "POST",
				credentials: "include",
			});

			if (response.ok) {
				// Redirection après déconnexion réussie
				window.location.href = "/paiement";
			}
		} catch (error) {
// console.error("Erreur lors de la déconnexion:", error);
		} finally {
			setIsPending(false);
		}
	};

	return (
		<Button
			type="button"
			onClick={handleSignOut}
			variant="ghost"
			size="sm"
			className="text-xs"
			disabled={isPending}
		>
			{isPending ? "Déconnexion..." : "Déconnexion"}
		</Button>
	);
}
