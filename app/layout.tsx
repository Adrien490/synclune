import { UploadThingSSR } from "@/modules/media/components/uploadthing-ssr";
import { CookieBanner } from "@/shared/components/cookie-banner";
// Lazy-loaded: rarely shown (2nd visit + Chrome/Edge or iOS only)
const InstallPromptBanner = dynamic(() =>
	import("@/shared/components/install-prompt-banner").then((mod) => mod.InstallPromptBanner),
);
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { IconSprite } from "@/shared/components/icons/icon-sprite";
import { UnsavedChangesDialog } from "@/shared/components/navigation";
import { SkipLink } from "@/shared/components/skip-link";
import { AppToaster } from "@/shared/components/ui/toaster";
import { ConditionalAnalytics } from "@/shared/components/conditional-analytics";
import { WebVitalsReporter } from "@/shared/components/web-vitals-reporter";
import { rootMetadata, rootViewport } from "@/shared/constants/root-metadata";
import { SerwistProvider } from "@/shared/lib/serwist-client";
import { RootProviders } from "@/shared/providers/root-providers";
import { cormorantGaramond, inter, petitFormalScript } from "@/shared/styles/fonts";
import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = rootViewport;

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
				suppressHydrationWarning
			>
				<SerwistProvider swUrl="/serwist/sw.js">
					<SkipLink />
					<IconSprite />
					<ErrorBoundary fallback={null}>
						<Suspense fallback={null}>
							<UploadThingSSR />
						</Suspense>
					</ErrorBoundary>
					<RootProviders>
						<ConditionalAnalytics />
						<WebVitalsReporter />
						{children}
						<UnsavedChangesDialog />
						<CookieBanner />
						<InstallPromptBanner />
					</RootProviders>
					<AppToaster />
				</SerwistProvider>
			</body>
		</html>
	);
}
