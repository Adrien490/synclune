import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { ConditionalAnalytics } from "@/shared/components/conditional-analytics";
import { CookieBanner } from "@/shared/components/cookie-banner";
import { IconSprite } from "@/shared/components/icons/icon-sprite";
import { SkipLink } from "@/shared/components/skip-link";
import { AppToaster } from "@/shared/components/ui/toaster";
import { BUSINESS_INFO, SEO_DEFAULTS, SITE_URL } from "@/shared/constants/seo-config";
import { crimsonPro, inter, jetBrainsMono } from "@/shared/styles/fonts";
import { UploadThingSSR } from "@/modules/media/lib/uploadthing/uploadthing-ssr";
import { AlertDialogStoreProvider } from "@/shared/providers/alert-dialog-store-provider";
import { CookieConsentStoreProvider } from "@/shared/providers/cookie-consent-store-provider";
import { DialogStoreProvider } from "@/shared/providers/dialog-store-provider";
import { SheetStoreProvider } from "@/shared/providers/sheet-store-provider";
import { CartSheet } from "@/modules/cart/components/cart-sheet";
import { MotionConfig } from "framer-motion";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { getCart } from "@/modules/cart/data/get-cart";
import { CartSheetSkeleton } from "@/modules/cart/components/cart-sheet-skeleton";

export const metadata: Metadata = {
	title: {
		default: "Synclune - Bijoux artisanaux faits main à Nantes (44) - Loire-Atlantique",
		template: "%s | Synclune Nantes",
	},
	description:
		"Créatrice de bijoux artisanaux à Nantes (44). Boucles d'oreilles, colliers, bracelets faits main. Éditions limitées colorées inspirées de Pokémon, Van Gogh, Twilight. Atelier en Loire-Atlantique. Pièces uniques 100% faites main.",
	keywords: [
		"bijoux faits main Nantes",
		"bijoux artisanaux Nantes",
		"créatrice bijoux Nantes",
		"bijoux colorés Nantes",
		"boucles d'oreilles Nantes",
		"colliers Nantes",
		"bracelets Nantes",
		"bijoux Loire-Atlantique",
		"atelier bijoux Nantes 44",
		"bijoux originaux Nantes",
		"Synclune",
		"bijoux français",
		"création artisanale",
		"bijoux personnalisés Nantes",
		...BUSINESS_INFO.localKeywords,
	],
	authors: [{ name: "Synclune" }],
	creator: "Synclune",
	publisher: "Synclune",
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	metadataBase: new URL(SITE_URL),
	alternates: {
		canonical: "/",
	},
	openGraph: {
		type: "website",
		locale: SEO_DEFAULTS.locale,
		url: SITE_URL,
		siteName: SEO_DEFAULTS.siteName,
		title: "Synclune - Bijoux artisanaux faits main à Nantes (44)",
		description:
			"Créatrice de bijoux artisanaux à Nantes. Boucles d'oreilles, colliers, bracelets colorés faits main. Éditions limitées inspirées de Pokémon, Van Gogh. Loire-Atlantique.",
		images: [
			{
				url: SEO_DEFAULTS.images.default,
				width: SEO_DEFAULTS.images.width,
				height: SEO_DEFAULTS.images.height,
				alt: "Synclune - Bijoux artisanaux faits main à Nantes (44) Loire-Atlantique",
			},
		],
	},
	twitter: {
		card: SEO_DEFAULTS.twitter.card,
		title: "Synclune - Bijoux artisanaux faits main à Nantes (44)",
		description:
			"Bijoux colorés faits main à Nantes. Boucles d'oreilles, colliers, bracelets. Créations uniques en Loire-Atlantique.",
		images: [SEO_DEFAULTS.images.default],
	},
	robots: {
		index: false,
		follow: false,
		googleBot: {
			index: false,
			follow: false,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
	verification: {
		// À ajouter après création des comptes
		// google: "votre-code-google-search-console",
		// bing: "votre-code-bing-webmaster",
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "Synclune",
	},
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	viewportFit: "cover",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#e493b3" },
		{ media: "(prefers-color-scheme: dark)", color: "#e493b3" },
	],
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="fr" data-scroll-behavior="smooth">
			<head></head>
			<body
				className={`${inter.className} ${crimsonPro.variable} ${jetBrainsMono.variable} antialiased`}
			>
				<SkipLink />
				<IconSprite />
				<Suspense fallback={null}>
					<UploadThingSSR />
				</Suspense>
				<MotionConfig
					transition={{
						duration: MOTION_CONFIG.duration.normal,
						ease: MOTION_CONFIG.easing.easeOut,
					}}
				>
					<Suspense fallback={null}>
						<CookieConsentStoreProvider>
							<ConditionalAnalytics />
							<DialogStoreProvider>
								<SheetStoreProvider>
									<AlertDialogStoreProvider>
										<main id="main-content">
											{children}
										</main>

										<Suspense fallback={<CartSheetSkeleton />}>
											<CartSheet cartPromise={getCart()} />
										</Suspense>
									</AlertDialogStoreProvider>
								</SheetStoreProvider>
							</DialogStoreProvider>
							<CookieBanner />
						</CookieConsentStoreProvider>
					</Suspense>
				</MotionConfig>
				<AppToaster />
			</body>
		</html>
	);
}
