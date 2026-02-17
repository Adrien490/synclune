import { CartSheetSkeleton } from "@/modules/cart/components/cart-sheet-skeleton";
import { getCart } from "@/modules/cart/data/get-cart";
import { UploadThingSSR } from "@/modules/media/components/uploadthing-ssr";
import { CookieBanner } from "@/shared/components/cookie-banner";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { IconSprite } from "@/shared/components/icons/icon-sprite";
import { UnsavedChangesDialog } from "@/shared/components/navigation";
import { SkipLink } from "@/shared/components/skip-link";
import { StructuredDataAsync } from "@/shared/components/structured-data-async";
import { AppToaster } from "@/shared/components/ui/toaster";
import { ConditionalAnalytics } from "@/shared/components/conditional-analytics";
import { rootMetadata, rootViewport } from "@/shared/constants/root-metadata";
import { SerwistProvider } from "@/shared/lib/serwist-client";
import { RootProviders } from "@/shared/providers/root-providers";
import { cormorantGaramond, inter, petitFormalScript } from "@/shared/styles/fonts";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import "./globals.css";

// Lazy loading des composants lourds - charges uniquement a l'ouverture
const CartSheet = dynamic(
	() => import("@/modules/cart/components/cart-sheet").then((mod) => mod.CartSheet)
);

const SkuSelectorDialog = dynamic(
	() => import("@/modules/cart/components/sku-selector-dialog").then((mod) => mod.SkuSelectorDialog)
);

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="fr" data-scroll-behavior="smooth">
			<head>
				{/* Preconnect to UploadThing CDN for faster image loading */}
				<link rel="dns-prefetch" href="https://utfs.io" />
				<link rel="preconnect" href="https://utfs.io" crossOrigin="anonymous" />
				<link rel="dns-prefetch" href="https://x1ain1wpub.ufs.sh" />
				<link rel="preconnect" href="https://x1ain1wpub.ufs.sh" crossOrigin="anonymous" />
				{/* Preconnect to Stripe for faster checkout initialization */}
				<link rel="dns-prefetch" href="https://js.stripe.com" />
				<link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
			</head>
			<body
				className={`${inter.variable} ${inter.className} ${cormorantGaramond.variable} ${petitFormalScript.variable} antialiased`}
			>
				<SerwistProvider swUrl="/serwist/sw.js">
					<SkipLink />
					<IconSprite />
					<Suspense fallback={null}>
						<UploadThingSSR />
					</Suspense>
					<RootProviders>
						<Suspense fallback={null}>
							<ConditionalAnalytics />
							{children}

							<ErrorBoundary
								errorMessage="Impossible de charger le panier"
								className="fixed bottom-4 right-4 z-50 rounded-lg bg-muted shadow-lg flex items-center justify-center max-w-xs"
							>
								<Suspense fallback={<CartSheetSkeleton />}>
									<CartAndSkuLoader />
								</Suspense>
							</ErrorBoundary>
							<UnsavedChangesDialog />
							<CookieBanner />
						</Suspense>
					</RootProviders>
					<AppToaster />
					{/* JSON-LD global - placé dans body comme recommandé par Next.js */}
					<Suspense fallback={null}>
						<StructuredDataAsync />
					</Suspense>
				</SerwistProvider>
			</body>
		</html>
	);
}

async function CartAndSkuLoader() {
	const cart = await getCart();
	return (
		<>
			<CartSheet cart={cart} />
			<SkuSelectorDialog cart={cart} />
		</>
	);
}
