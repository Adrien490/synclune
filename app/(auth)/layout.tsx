export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-background">
			<main id="auth-content" role="main">
				{children}
			</main>
		</div>
	);
}
