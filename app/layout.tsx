import { UploadThingSSR } from "@/modules/media/components/uploadthing-ssr";
import { CookieBanner } from "@/shared/components/cookie-banner";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { IconSprite } from "@/shared/components/icons/icon-sprite";
import { UnsavedChangesDialog } from "@/shared/components/navigation";
import { PostHogIdentifyAsync } from "@/shared/components/posthog-identify-async";
import { SkipLink } from "@/shared/components/skip-link";
import { AppToaster } from "@/shared/components/ui/toaster";
import { ConditionalAnalytics } from "@/shared/components/conditional-analytics";
import { WebVitalsReporter } from "@/shared/components/web-vitals-reporter";
import { rootMetadata, rootViewport } from "@/shared/constants/root-metadata";
import { SerwistProvider } from "@/shared/lib/serwist-client";
import { RootProviders } from "@/shared/providers/root-providers";
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
				{/* Preconnect to UploadThing CDN for faster image loading */}
				<link rel="dns-prefetch" href="https://utfs.io" />
				<link rel="preconnect" href="https://utfs.io" crossOrigin="anonymous" />
				<link rel="dns-prefetch" href="https://x1ain1wpub.ufs.sh" />
				<link rel="preconnect" href="https://x1ain1wpub.ufs.sh" crossOrigin="anonymous" />
				{/* Preconnect to Stripe for faster checkout initialization */}
				<link rel="dns-prefetch" href="https://js.stripe.com" />
				<link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
			</head>
			<body className={`${figtree.className} antialiased`} suppressHydrationWarning>
				<noscript>
					<div
						style={{
							padding: "12px 16px",
							backgroundColor: "#fef3c7",
							color: "#92400e",
							textAlign: "center",
							fontSize: "14px",
						}}
					>
						JavaScript est nécessaire pour utiliser toutes les fonctionnalités de Synclune (panier,
						paiement, recherche). Veuillez activer JavaScript dans votre navigateur.
					</div>
				</noscript>
				<SerwistProvider swUrl="/serwist/sw.js">
					<SkipLink />
					<IconSprite />
					<ErrorBoundary fallback={null}>
						<Suspense fallback={null}>
							<UploadThingSSR />
						</Suspense>
					</ErrorBoundary>
					<RootProviders>
						<Suspense fallback={null}>
							<PostHogIdentifyAsync />
						</Suspense>
						<ConditionalAnalytics />
						<WebVitalsReporter />
						{children}
						<UnsavedChangesDialog />
						<CookieBanner />
					</RootProviders>
					<AppToaster />
				</SerwistProvider>
			</body>
		</html>
	);
}
