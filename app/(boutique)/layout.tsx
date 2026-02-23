import { Footer } from "@/app/(boutique)/(accueil)/_components/footer";
import { Navbar } from "@/app/(boutique)/(accueil)/_components/navbar";
import { NavbarSkeleton } from "@/app/(boutique)/(accueil)/_components/navbar/navbar-skeleton";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { ScrollToTop } from "@/shared/components/scroll-to-top";
import { Suspense } from "react";

interface ShopLayoutProps {
	children: React.ReactNode;
}

export default async function ShopLayout({
	children,
}: ShopLayoutProps) {
	return (
		<>
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:font-medium focus:shadow-lg"
			>
				Aller au contenu principal
			</a>
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
				{children}
			</main>
			<Footer />
			<ScrollToTop />
		</>
	);
}
