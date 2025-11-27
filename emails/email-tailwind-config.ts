import type { TailwindConfig } from "@react-email/components";
import { pixelBasedPreset } from "@react-email/tailwind";

/**
 * Configuration Tailwind pour les emails - Synclune
 * Basé sur le design system coloré et pétillant de globals.css
 *
 * IMPORTANT:
 * - Utilise pixelBasedPreset pour compatibilité email (px au lieu de rem)
 * - Couleurs converties depuis oklch vers hex pour support universel
 * - Dégradés organiques rose-doré pour identité visuelle forte
 */
export const emailTailwindConfig: TailwindConfig = {
	presets: [pixelBasedPreset],
	theme: {
		extend: {
			colors: {
				// ==========================================
				// COULEURS DE BASE - Synclune Theme (globals.css)
				// ==========================================
				background: "#FCFCFC", // oklch(0.99 0.005 270) - Blanc cassé
				foreground: "#212121", // oklch(0.13 0.01 270) - Noir doux
				card: "#ffffff", // Blanc pur
				"card-foreground": "#212121",

				// ==========================================
				// PRIMARY - Rose doux accessible (WCAG AA)
				// ==========================================
				primary: {
					DEFAULT: "#E5B3CD", // oklch(0.8593 0.097 340.78) - Rose foncé accessible
					foreground: "#1A0A0F", // Noir pour contraste
				},

				// ==========================================
				// SECONDARY - Beige champagne élégant
				// ==========================================
				secondary: {
					DEFAULT: "#F3E9CF", // oklch(0.9221 0.0871 86.29) - Beige champagne
					foreground: "#212121",
				},

				// ==========================================
				// MUTED - Gris neutres
				// ==========================================
				muted: {
					DEFAULT: "#EFEFEF", // oklch(0.94 0.01 270) - Gris très clair
					foreground: "#858585", // oklch(0.55 0.01 270) - Gris moyen (WCAG AAA)
				},

				// ==========================================
				// ACCENT - Pour highlights
				// ==========================================
				accent: {
					DEFAULT: "#EFEFEF",
					foreground: "#212121",
				},

				// ==========================================
				// BORDERS & INPUTS
				// ==========================================
				border: "#E8E8E8", // oklch(0.92 0.01 270) - Bordure grise
				input: "#EFEFEF",
				ring: "#E5B3CD", // Primary pour focus

				// ==========================================
				// SEMANTIC COLORS
				// ==========================================
				destructive: {
					DEFAULT: "#AD8482", // oklch(0.59 0.17 25) - Rouge doux
					foreground: "#ffffff",
				},

				// ==========================================
				// CHART COLORS (pour emails avec stats)
				// ==========================================
				chart: {
					1: "#E5B3CD", // Rose primary
					2: "#F3E9CF", // Beige secondary
					3: "#C8A7BA", // Rose moyen
					4: "#EBD4A7", // Beige moyen
					5: "#EFEFEF", // Gris clair
				},
			},

			fontFamily: {
				sans: [
					"ui-sans-serif",
					"system-ui",
					"-apple-system",
					"BlinkMacSystemFont",
					"Segoe UI",
					"Roboto",
					"Helvetica Neue",
					"Arial",
					"sans-serif",
				],
				serif: ["ui-serif", "Georgia", "serif"],
				display: ["ui-serif", "Georgia", "serif"],
				mono: ["JetBrains Mono", "monospace"],
			},

			borderRadius: {
				DEFAULT: "6px", // --radius
				sm: "8px", // --radius-sm
				md: "10px", // --radius-md
				lg: "16px", // --radius-lg
				xl: "24px", // --radius-xl
				full: "9999px", // --radius-full
			},

			spacing: {
				// Spacing basé sur pixels (compatibilité email via pixelBasedPreset)
				"0": "0px",
				"1": "4px",
				"2": "8px",
				"3": "12px",
				"4": "16px",
				"5": "20px",
				"6": "24px",
				"8": "32px",
				"10": "40px",
				"12": "48px",
				"16": "64px",
				"20": "80px",
				"24": "96px",
			},

			fontSize: {
				xs: ["12px", { lineHeight: "16px" }],
				sm: ["14px", { lineHeight: "20px" }],
				base: ["16px", { lineHeight: "24px" }],
				lg: ["18px", { lineHeight: "28px" }],
				xl: ["20px", { lineHeight: "28px" }],
				"2xl": ["24px", { lineHeight: "32px" }],
				"3xl": ["28px", { lineHeight: "36px" }],
				"4xl": ["32px", { lineHeight: "40px" }],
			},

			boxShadow: {
				sm: "0px 4px 8px -1px rgba(0, 0, 0, 0.1), 0px 1px 2px -2px rgba(0, 0, 0, 0.1)",
				DEFAULT:
					"0px 4px 8px -1px rgba(0, 0, 0, 0.1), 0px 1px 2px -2px rgba(0, 0, 0, 0.1)",
				md: "0px 4px 8px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.1)",
				lg: "0px 4px 8px -1px rgba(0, 0, 0, 0.1), 0px 4px 6px -2px rgba(0, 0, 0, 0.1)",
				xl: "0px 4px 8px -1px rgba(0, 0, 0, 0.1), 0px 8px 10px -2px rgba(0, 0, 0, 0.1)",
				"2xl": "0px 4px 8px -1px rgba(0, 0, 0, 0.25)",
			},
		},
	},
};
