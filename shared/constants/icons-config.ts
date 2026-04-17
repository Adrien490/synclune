import type { Metadata } from "next";

/**
 * Apple splash screens for standalone PWA launch on iOS.
 *
 * Each entry targets a specific device via media query (Retina multiplier +
 * logical resolution). iOS Safari displays the matching image while the PWA
 * is loading in standalone mode. Without these, users see a blank white screen.
 *
 * Asset convention: `/splash/apple-splash-<width>-<height>.png`
 * If the dedicated splash file is missing, iOS falls back to the background
 * color declared in manifest.ts (#fcfcfd). Drop matching PNGs into
 * `public/splash/` to replace the fallback.
 */
const APPLE_SPLASH_SCREENS: Array<{ rel: string; url: string; media?: string }> = [
	// iPhone 15 / 14 Pro / 14 (2556×1179) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-1179-2556.png",
		media:
			"screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
	},
	// iPhone 14 Pro Max / 15 Plus (2796×1290) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-1290-2796.png",
		media:
			"screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
	},
	// iPhone 13 / 13 Pro / 12 / 12 Pro (2532×1170) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-1170-2532.png",
		media:
			"screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
	},
	// iPhone 13 mini / 12 mini / 11 Pro / XS / X (2436×1125) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-1125-2436.png",
		media:
			"screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
	},
	// iPhone 11 / XR (1792×828) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-828-1792.png",
		media:
			"screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
	},
	// iPhone SE 3rd / 8 / 7 / 6s (1334×750) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-750-1334.png",
		media:
			"screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
	},
	// iPad Pro 12.9" (2732×2048) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-2048-2732.png",
		media:
			"screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
	},
	// iPad Pro 11" (2388×1668) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-1668-2388.png",
		media:
			"screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
	},
	// iPad Air / 10.5" (2224×1668) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-1668-2224.png",
		media:
			"screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
	},
	// iPad 10.2" (2160×1620) — portrait
	{
		rel: "apple-touch-startup-image",
		url: "/splash/apple-splash-1620-2160.png",
		media:
			"screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
	},
];

/**
 * Configuration des icones pour le manifest et les balises meta.
 * Extrait du RootLayout pour allegement.
 */
export const ICONS_CONFIG: Metadata["icons"] = {
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
	other: [
		{ rel: "apple-touch-icon-precomposed", url: "/icons/apple-icon-precomposed.png" },
		...APPLE_SPLASH_SCREENS,
	],
};
