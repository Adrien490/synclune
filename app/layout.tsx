import { UploadThingSSR } from "@/modules/media/components/uploadthing-ssr";
import { CookieBanner } from "@/shared/components/cookie-banner";

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
			<body className={`${figtree.className} antialiased`} suppressHydrationWarning>
				<SerwistProvider swUrl="/serwist/sw.js">
					<SkipLink />
					<IconSprite />
					<Suspense fallback={null}>
						<UploadThingSSR />
					</Suspense>
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
