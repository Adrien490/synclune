import { Navbar } from "@/app/(boutique)/(accueil)/_components/navbar";
import { NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar/navbar-skeleton";
import { Suspense } from "react";
import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";

export default async function ShopLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
			>
				Passer au contenu principal
			</a>
			<Suspense fallback={<NavbarSkeleton />}>
				<Navbar />
			</Suspense>
			<main
				id="main-content"
				role="main"
				aria-label="Contenu principal"
				className="min-h-screen"
			>
				{children}
			</main>
			<Footer />
		</>
	);
}
