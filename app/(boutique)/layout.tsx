import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";
import { Navbar } from "@/app/(boutique)/(accueil)/_components/navbar";
import { NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar/navbar-skeleton";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { ScrollToTop } from "@/shared/components/scroll-to-top";
import { Suspense, ViewTransition } from "react";

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default async function ShopLayout({
	children,
}: ShopLayoutProps) {
	return (
		<>
			<ErrorBoundary fallback={<NavbarSkeleton />}>
				<Suspense fallback={<NavbarSkeleton />}>
					<Navbar />
				</Suspense>
			</ErrorBoundary>
			<main
				id="main-content"
				aria-label="Contenu principal"
				className="min-h-screen"
			>
				<ViewTransition default="vt-page">
					{children}
				</ViewTransition>
			</main>
			<Footer />
			<ScrollToTop />
		</>
	);
}
