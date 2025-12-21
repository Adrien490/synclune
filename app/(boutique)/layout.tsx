import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";
import { Navbar } from "@/app/(boutique)/(accueil)/_components/navbar";
import { NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar/navbar-skeleton";
import { Suspense } from "react";

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default async function ShopLayout({
	children,
}: ShopLayoutProps) {
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
