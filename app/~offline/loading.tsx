export default function OfflineLoading() {
	return (
		<main className="bg-background flex min-h-screen items-center justify-center">
			<div
				className="border-muted border-t-primary size-10 animate-spin rounded-full border-3"
				role="status"
				aria-label="Chargement"
			/>
		</main>
	);
}
