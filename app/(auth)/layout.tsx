import Link from "next/link";

export default function AuthLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-background flex flex-col">
			<main id="auth-content" role="main" className="flex-1">
				{children}
			</main>
			<footer className="py-4 text-center text-sm text-muted-foreground" aria-label="Liens légaux">
				<nav aria-label="Liens du pied de page">
					<ul className="flex justify-center gap-4">
						<li>
							<Link href="/mentions-legales" className="hover:underline focus-visible:underline focus-visible:outline-none">
								Mentions légales
							</Link>
						</li>
						<li>
							<Link href="/politique-de-confidentialite" className="hover:underline focus-visible:underline focus-visible:outline-none">
								Confidentialité
							</Link>
						</li>
						<li>
							<Link href="/cgv" className="hover:underline focus-visible:underline focus-visible:outline-none">
								CGV
							</Link>
						</li>
					</ul>
				</nav>
			</footer>
		</div>
	);
}
