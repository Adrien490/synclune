import { stripeClient } from "@better-auth/stripe/client";
import { createAuthClient } from "better-auth/react"; // Utiliser better-auth/react pour Next.js

export const authClient = createAuthClient({
	baseURL: process.env.BETTER_AUTH_URL!,
	plugins: [
		stripeClient({
			subscription: false, // Pas d'abonnements, juste paiements one-time
		}),
	],
});

export { authClient as client };
