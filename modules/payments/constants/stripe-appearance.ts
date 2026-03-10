import type { Appearance } from "@stripe/stripe-js";

export const stripeAppearance: Appearance = {
	theme: "stripe",
	variables: {
		colorPrimary: "#7c3aed",
		borderRadius: "0.75rem",
		fontFamily:
			'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
		fontSizeBase: "15px",
		spacingUnit: "4px",
		colorBackground: "#ffffff",
		colorText: "#1a1a2e",
		colorDanger: "#ef4444",
	},
	rules: {
		".Input": {
			border: "1px solid #e2e8f0",
			boxShadow: "none",
			padding: "10px 12px",
		},
		".Input:focus": {
			border: "1px solid #7c3aed",
			boxShadow: "0 0 0 1px #7c3aed",
		},
		".Tab": {
			border: "1px solid #e2e8f0",
			boxShadow: "none",
		},
		".Tab--selected": {
			border: "1px solid #7c3aed",
			boxShadow: "0 0 0 1px #7c3aed",
		},
		".Label": {
			fontWeight: "500",
			fontSize: "14px",
		},
	},
};
