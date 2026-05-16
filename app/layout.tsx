import { FlyToCartOverlay } from "@/modules/cart/components/fly-to-cart-overlay";
import { UploadThingSSR } from "@/modules/media/components/uploadthing-ssr";
import { IconSprite } from "@/shared/components/icons/icon-sprite";
import { UnsavedChangesDialog } from "@/shared/components/navigation";
import { SkipLink } from "@/shared/components/skip-link";
import { AppToaster } from "@/shared/components/ui/toaster";
import { rootMetadata, rootViewport } from "@/shared/constants/root-metadata";
import { NavigationGuardProvider } from "@/shared/contexts/navigation-guard-context";
import { SerwistProvider } from "@/shared/lib/serwist-client";
import { AlertDialogStoreProvider } from "@/shared/providers/alert-dialog-store-provider";
import { CookieConsentStoreProvider } from "@/shared/providers/cookie-consent-store-provider";
import { DialogStoreProvider } from "@/shared/providers/dialog-store-provider";
import { MotionProvider } from "@/shared/providers/motion-provider";
import { SheetStoreProvider } from "@/shared/providers/sheet-store-provider";
import { fraunces, figtree, caveat } from "@/shared/styles/fonts";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
						</CookieConsentStoreProvider>
						<AppToaster />
					</MotionProvider>
				</SerwistProvider>
				<Analytics />
				<SpeedInsights />
			</body>
		</html>
	);
}
