export default function OfflineLoading() {
	return (
		<main className="min-h-screen flex items-center justify-center bg-background">
			<div
				className="size-10 rounded-full border-3 border-muted border-t-primary animate-spin"
				role="status"
				aria-label="Chargement"
			/>
		</main>
	);
}
