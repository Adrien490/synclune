"use client";

import { Button } from "@/shared/components/ui/button";
import { useCookieConsentStore } from "@/shared/providers/cookie-consent-store-provider";
import { APP_TIME_ZONE } from "@/shared/utils/timezone";
import { useEffect, useState } from "react";

// `timeZone` explicite : sans lui, le rendu serveur (UTC) et le navigateur
// (Paris) peuvent afficher deux jours différents → mismatch d'hydratation.
const CONSENT_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "short",
	timeZone: APP_TIME_ZONE,
});

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
			<div className="bg-muted/50 rounded-lg border p-4">
				<h3 className="mb-2 font-semibold">Statut actuel</h3>
				<p className="text-muted-foreground text-sm">
					{accepted === null ? (
						"Vous n'avez pas encore fait de choix."
					) : accepted ? (
						<>
							Cookies <span className="text-success font-medium">acceptés</span>
						</>
					) : (
						<>
							Cookies <span className="text-warning font-medium">refusés</span>
						</>
					)}
				</p>
				{consentDate && (
					<p className="text-muted-foreground mt-1 text-xs">
						Dernière modification : {CONSENT_DATE_FORMATTER.format(new Date(consentDate))}
					</p>
				)}
			</div>

			{/* Message de confirmation */}
			{saved && (
				<div className="border-success/30 bg-success/10 rounded-md border p-3" role="status">
					<p className="text-success text-sm">Vos préférences ont été enregistrées</p>
				</div>
			)}

			{/* Boutons d'action */}
			<div className="flex flex-col gap-3 sm:flex-row">
				<Button onClick={handleAccept} variant="secondary" className="flex-1">
					Accepter les cookies
				</Button>
				<Button onClick={handleReject} variant="secondary" className="flex-1">
					Refuser les cookies
				</Button>
			</div>
		</div>
	);
}
