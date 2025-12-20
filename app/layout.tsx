import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { ConditionalAnalytics } from "@/shared/components/conditional-analytics";
import { CookieBanner } from "@/shared/components/cookie-banner";
import { IconSprite } from "@/shared/components/icons/icon-sprite";
import { UnsavedChangesDialog } from "@/shared/components/navigation";
import { SkipLink } from "@/shared/components/skip-link";
import SystemBanner from "@/shared/components/ui/system-banner";
import { AppToaster } from "@/shared/components/ui/toaster";
import { BUSINESS_INFO, SEO_DEFAULTS, SITE_URL } from "@/shared/constants/seo-config";
import { NavigationGuardProvider } from "@/shared/contexts/navigation-guard-context";
import { crimsonPro, inter, jetBrainsMono } from "@/shared/styles/fonts";
import { UploadThingSSR } from "@/modules/media/lib/uploadthing/uploadthing-ssr";
import { AlertDialogStoreProvider } from "@/shared/providers/alert-dialog-store-provider";
import { CookieConsentStoreProvider } from "@/shared/providers/cookie-consent-store-provider";
import { DialogStoreProvider } from "@/shared/providers/dialog-store-provider";
import { SheetStoreProvider } from "@/shared/providers/sheet-store-provider";
import { CartSheet } from "@/modules/cart/components/cart-sheet";
import { SkuSelectorDialog } from "@/modules/cart/components/sku-selector-dialog";
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
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
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
	icons: {
		icon: [
			{ url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
			{ url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
			{ url: "/icons/favicon-96x96.png", sizes: "96x96", type: "image/png" },
		],
		apple: [
			{ url: "/icons/apple-icon-57x57.png", sizes: "57x57" },
			{ url: "/icons/apple-icon-60x60.png", sizes: "60x60" },
			{ url: "/icons/apple-icon-72x72.png", sizes: "72x72" },
			{ url: "/icons/apple-icon-76x76.png", sizes: "76x76" },
			{ url: "/icons/apple-icon-114x114.png", sizes: "114x114" },
			{ url: "/icons/apple-icon-120x120.png", sizes: "120x120" },
			{ url: "/icons/apple-icon-144x144.png", sizes: "144x144" },
			{ url: "/icons/apple-icon-152x152.png", sizes: "152x152" },
			{ url: "/icons/apple-icon-180x180.png", sizes: "180x180" },
		],
		other: [{ rel: "apple-touch-icon-precomposed", url: "/icons/apple-icon-precomposed.png" }],
	},
	other: {
		"msapplication-TileColor": "#F5B0C1",
		"msapplication-TileImage": "/icons/ms-icon-144x144.png",
		"msapplication-config": "/browserconfig.xml",
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
				<SystemBanner
					text="Mode Developpement"
					color="bg-orange-500"
					size="sm"
					show={process.env.NODE_ENV === "development"}
				/>
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
							<NavigationGuardProvider>
								<DialogStoreProvider>
									<SheetStoreProvider>
										<AlertDialogStoreProvider>
											<main id="main-content">
												{children}
											</main>

											<Suspense fallback={<CartSheetSkeleton />}>
												<CartSheet cartPromise={getCart()} />
											</Suspense>
											<Suspense fallback={null}>
												<SkuSelectorDialog cartPromise={getCart()} />
											</Suspense>
										</AlertDialogStoreProvider>
									</SheetStoreProvider>
								</DialogStoreProvider>
								<UnsavedChangesDialog />
							</NavigationGuardProvider>
							<CookieBanner />
						</CookieConsentStoreProvider>
					</Suspense>
				</MotionConfig>
				<AppToaster />
			</body>
		</html>
	);
}
