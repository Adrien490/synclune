"use client";

import { Button } from "@/shared/components/ui/button";

export default function OfflineError() {
	return (
		<main
			className="min-h-screen flex items-center justify-center px-4 bg-background"
			role="alert"
			aria-live="polite"
		>
			<div className="text-center space-y-4">
				<p className="text-6xl" aria-hidden="true">
					📡
				</p>
				<h1 className="text-2xl font-semibold">Hors ligne</h1>
				<p className="text-muted-foreground">
					Vérifiez votre connexion et réessayez.
				</p>
				<Button onClick={() => window.location.reload()}>
					Réessayer
				</Button>
			</div>
		</main>
	);
}
