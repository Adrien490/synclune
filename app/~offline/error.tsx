"use client";

export default function OfflineError() {
	return (
		<main className="min-h-screen flex items-center justify-center px-4 bg-background">
			<div className="text-center space-y-4">
				<p className="text-6xl" aria-hidden="true">
					📡
				</p>
				<h1 className="text-2xl font-semibold">Hors ligne</h1>
				<p className="text-muted-foreground">
					Vérifiez votre connexion et réessayez.
				</p>
				<button
					onClick={() => window.location.reload()}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
				>
					Réessayer
				</button>
			</div>
		</main>
	);
}
