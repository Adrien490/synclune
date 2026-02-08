import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";
import { Navbar } from "@/app/(boutique)/(accueil)/_components/navbar";
import { NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar/navbar-skeleton";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { ScrollToTop } from "@/shared/components/scroll-to-top";
import { Suspense } from "react";

interface ShopLayoutProps {
	children: React.ReactNode;
	quicksearch: React.ReactNode;
}

export default async function ShopLayout({
	children,
	quicksearch,
}: ShopLayoutProps) {
	return (
		<>
			<ErrorBoundary fallback={<NavbarSkeleton />}>
				<Suspense fallback={<NavbarSkeleton />}>
					<Navbar quickSearchSlot={quicksearch} />
				</Suspense>
			</ErrorBoundary>
			<main
				id="main-content"
				aria-label="Contenu principal"
				className="min-h-screen"
			>
				{children}
			</main>
			<Footer />
			<ScrollToTop />
		</>
	);
}
