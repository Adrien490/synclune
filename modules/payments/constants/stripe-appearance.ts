import type { Appearance } from "@stripe/stripe-js";

/**
 * Stripe PaymentElement appearance aligned on Synclune OKLCH tokens.
 *
 * Synclune brand colors are defined in `app/globals.css` as OKLCH.
 * Stripe Elements requires hex/rgb — values below are precomputed equivalents.
 *
 * | Stripe var               | CSS token               | OKLCH                    | HEX      |
 * | ------------------------ | ----------------------- | ------------------------ | -------- |
 * | colorPrimary             | --primary-text          | 0.5 0.15 340.78          | #b74585  |
 * | colorBackground          | --background            | 0.99 0.005 270           | #fcfcfd  |
 * | colorText                | --foreground            | 0.13 0.01 270            | #1a1a2e  |
 * | colorTextSecondary       | --muted-foreground      | 0.55 0.01 270            | #868592  |
 * | colorDanger              | --destructive           | 0.59 0.17 25             | #d14639  |
 *
 * `.Input` vertical padding 14px → 44px touch target (WCAG 2.5.5 AAA).
 */
export const stripeAppearance: Appearance = {
	theme: "stripe",
	variables: {
		colorPrimary: "#b74585",
		colorBackground: "#ffffff",
		colorText: "#1a1a2e",
		colorTextSecondary: "#868592",
		colorDanger: "#d14639",
		borderRadius: "0.75rem",
		fontFamily:
			'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
		fontSizeBase: "16px",
		spacingUnit: "4px",
	},
	rules: {
		".Input": {
			border: "1px solid #e7e7ea",
			boxShadow: "none",
			padding: "14px 12px",
		},
		".Input:focus": {
			border: "1px solid #b74585",
			boxShadow: "0 0 0 1px #b74585",
		},
		".Tab": {
			border: "1px solid #e7e7ea",
			boxShadow: "none",
		},
		".Tab--selected": {
			border: "1px solid #b74585",
			boxShadow: "0 0 0 1px #b74585",
		},
		".Label": {
			fontWeight: "500",
			fontSize: "14px",
			color: "#1a1a2e",
		},
	},
};

/**
 * Dark mode counterpart — selected via `useStripeAppearance` when the user's
 * system prefers dark. Synclune doesn't ship a dark theme yet but this keeps
 * Stripe Elements from clashing on devices with `prefers-color-scheme: dark`.
 */
export const stripeAppearanceDark: Appearance = {
	theme: "night",
	variables: {
		colorPrimary: "#d977b0",
		colorBackground: "#1a1a2e",
		colorText: "#fcfcfd",
		colorTextSecondary: "#a8a8b3",
		colorDanger: "#e87568",
		borderRadius: "0.75rem",
		fontFamily:
			'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
		fontSizeBase: "16px",
		spacingUnit: "4px",
	},
	rules: {
		".Input": {
			border: "1px solid #3a3a4e",
			boxShadow: "none",
			padding: "14px 12px",
		},
		".Input:focus": {
			border: "1px solid #d977b0",
			boxShadow: "0 0 0 1px #d977b0",
		},
		".Tab": {
			border: "1px solid #3a3a4e",
			boxShadow: "none",
		},
		".Tab--selected": {
			border: "1px solid #d977b0",
			boxShadow: "0 0 0 1px #d977b0",
		},
		".Label": {
			fontWeight: "500",
			fontSize: "14px",
			color: "#fcfcfd",
		},
	},
};
