export default function OfflineLoading() {
	return (
		<main className="bg-background flex min-h-screen items-center justify-center">
			<div
				className="border-muted border-t-primary size-10 rounded-full border-3 motion-safe:animate-spin"
				role="status"
				aria-label="Chargement"
			/>
		</main>
	);
}
