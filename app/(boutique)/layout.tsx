import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";
import { Navbar } from "@/app/(boutique)/(accueil)/_components/navbar";
import { NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar/navbar-skeleton";
import { Suspense } from "react";

export default async function ShopLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
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
