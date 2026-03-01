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
			<div className="bg-muted/50 rounded-lg border p-4">
				<h3 className="mb-2 font-semibold">Statut actuel</h3>
				<p className="text-muted-foreground text-sm">
					{accepted === null ? (
						"Vous n'avez pas encore fait de choix."
					) : accepted ? (
						<>
							Cookies{" "}
							<span className="font-medium text-green-600 dark:text-green-400">acceptés</span>
						</>
					) : (
						<>
							Cookies{" "}
							<span className="font-medium text-orange-600 dark:text-orange-400">refusés</span>
						</>
					)}
				</p>
				{consentDate && (
					<p className="text-muted-foreground mt-1 text-xs">
						Dernière modification : {new Date(consentDate).toLocaleDateString("fr-FR")}
					</p>
				)}
			</div>

			{/* Message de confirmation */}
			{saved && (
				<div
					className="rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/20"
					role="status"
				>
					<p className="text-sm text-green-800 dark:text-green-200">
						Vos préférences ont été enregistrées
					</p>
				</div>
			)}

			{/* Boutons d'action */}
			<div className="flex flex-col gap-3 sm:flex-row">
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
