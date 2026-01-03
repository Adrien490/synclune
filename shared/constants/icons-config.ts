import type { Metadata } from "next";

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
	],
};
