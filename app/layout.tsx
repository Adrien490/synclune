import { WebVitalsReporter } from "@/app/_components/web-vitals-reporter";
import { FlyToCartOverlay } from "@/modules/cart/components/fly-to-cart-overlay";
import { UploadThingSSR } from "@/modules/media/components/uploadthing-ssr";
import { IconSprite } from "@/shared/components/icons/icon-sprite";
import { UnsavedChangesDialog } from "@/shared/components/navigation";
import { SkipLink } from "@/shared/components/skip-link";
import { AppToaster } from "@/shared/components/ui/toaster";
import { rootMetadata, rootViewport } from "@/shared/constants/root-metadata";
import { UPLOADTHING_CDN_HOSTS } from "@/shared/constants/uploadthing";
import { NavigationGuardProvider } from "@/shared/contexts/navigation-guard-context";
import { SerwistProvider } from "@/shared/lib/serwist-client";
import { AlertDialogStoreProvider } from "@/shared/providers/alert-dialog-store-provider";
import { CookieConsentStoreProvider } from "@/shared/providers/cookie-consent-store-provider";
import { DialogStoreProvider } from "@/shared/providers/dialog-store-provider";
import { MotionProvider } from "@/shared/providers/motion-provider";
import { SheetStoreProvider } from "@/shared/providers/sheet-store-provider";
import { ConditionalAnalytics } from "@/shared/components/conditional-analytics";
import { fraunces, figtree, caveat } from "@/shared/styles/fonts";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = rootViewport;

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="fr"
			className={`${figtree.variable} ${fraunces.variable} ${caveat.variable}`}
			data-scroll-behavior="smooth"
			suppressHydrationWarning
		>
			<head>
				{/* Preconnect au CDN UploadThing — économise DNS+TCP+TLS handshake
				    sur l'image LCP du Hero (resource load delay ~500-2000ms 4G mobile).
				    Pas de crossOrigin : next/image fait des fetch no-cors, et une preconnect
				    avec crossOrigin="anonymous" ouvre une connexion CORS-anonymous non réutilisable
				    par ces fetch (cf. Lighthouse "Préconnexion inutilisée"). */}
				{UPLOADTHING_CDN_HOSTS.map((host) => (
					<link key={host} rel="preconnect" href={host} />
				))}
			</head>
			<body className={`${figtree.className} antialiased`} suppressHydrationWarning>
				<SerwistProvider swUrl="/serwist/sw.js">
					<SkipLink />
					<IconSprite />
					<Suspense fallback={null}>
						<UploadThingSSR />
					</Suspense>
					<MotionProvider>
						<CookieConsentStoreProvider>
							<NavigationGuardProvider>
								<DialogStoreProvider>
									<SheetStoreProvider>
										<AlertDialogStoreProvider>
											{children}
											<FlyToCartOverlay />
											<UnsavedChangesDialog />
										</AlertDialogStoreProvider>
									</SheetStoreProvider>
								</DialogStoreProvider>
							</NavigationGuardProvider>
							<ConditionalAnalytics />
						</CookieConsentStoreProvider>
						<AppToaster />
					</MotionProvider>
				</SerwistProvider>
				<WebVitalsReporter />
			</body>
		</html>
	);
}
