"use client";

import { Button } from "@/shared/components/ui/button";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";
import { useEffect, useState } from "react";

export function CookiePreferences() {
	const accepted = useCookieConsentStore((state) => state.accepted);
	const acceptCookies = useCookieConsentStore((state) => state.acceptCookies);
	const rejectCookies = useCookieConsentStore((state) => state.rejectCookies);
	const consentDate = useCookieConsentStore((state) => state.consentDate);
	const [saved, setSaved] = useState(false);

	// Auto-dismiss confirmation after 3s
	useEffect(() => {
		if (!saved) return;
		const timer = setTimeout(() => setSaved(false), 3000);
		return () => clearTimeout(timer);
	}, [saved]);

	const handleAccept = () => {
		acceptCookies();
		setSaved(true);
	};

	const handleReject = () => {
		rejectCookies();
		setSaved(true);
	};

	return (
		<div className="space-y-6">
			<div className="p-4 bg-muted/50 rounded-lg border">
				<h3 className="font-semibold mb-2">Statut actuel</h3>
				<p className="text-sm text-muted-foreground">
					{accepted === null ? (
						"Vous n'avez pas encore fait de choix."
					) : accepted ? (
						<>
							Cookies <span className="text-green-600 dark:text-green-400 font-medium">acceptés</span>
						</>
					) : (
						<>
							Cookies <span className="text-orange-600 dark:text-orange-400 font-medium">refusés</span>
						</>
					)}
				</p>
				{consentDate && (
					<p className="text-xs text-muted-foreground mt-1">
						Dernière modification : {new Date(consentDate).toLocaleDateString("fr-FR")}
					</p>
				)}
			</div>

			{/* Message de confirmation */}
			{saved && (
				<div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md" role="status">
					<p className="text-sm text-green-800 dark:text-green-200">
						Vos préférences ont été enregistrées
					</p>
				</div>
			)}

			{/* Boutons d'action */}
			<div className="flex flex-col sm:flex-row gap-3">
				<Button onClick={handleAccept} className="flex-1">
					Accepter les cookies
				</Button>
				<Button onClick={handleReject} variant="outline" className="flex-1">
					Refuser les cookies
				</Button>
			</div>
		</div>
	);
}
