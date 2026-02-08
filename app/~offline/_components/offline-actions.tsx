"use client";

import { Button } from "@/shared/components/ui/button";
import { useEffect, useState } from "react";

/**
 * Reload button + automatic online detection
 * Auto-reloads when connection is restored
 */
export function OfflineActions() {
	const [stillOffline, setStillOffline] = useState(false);

	useEffect(() => {
		const handleOnline = () => {
			window.location.reload();
		};

		window.addEventListener("online", handleOnline);
		return () => window.removeEventListener("online", handleOnline);
	}, []);

	function handleRetry() {
		if (navigator.onLine) {
			window.location.reload();
		} else {
			setStillOffline(true);
			setTimeout(() => setStillOffline(false), 3000);
		}
	}

	return (
		<div className="space-y-3">
			<Button size="lg" onClick={handleRetry}>
				Réessayer
			</Button>
			{stillOffline && (
				<p className="text-sm text-muted-foreground animate-in fade-in" role="status">
					Toujours hors ligne... Vérifiez votre connexion.
				</p>
			)}
		</div>
	);
}
