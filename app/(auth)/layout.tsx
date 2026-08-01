export default function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-background relative min-h-dvh">
			<main id="main-content" tabIndex={-1}>
				{children}
			</main>
		</div>
	);
}
