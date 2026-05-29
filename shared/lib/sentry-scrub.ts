/**
 * Scrubber d'events Sentry — défense en profondeur PCI / RGPD.
 *
 * `beforeSend` n'applique par défaut aucun masquage : `sendDefaultPii: false`
 * empêche seulement la capture AUTOMATIQUE de PII (headers, body, IP). Tout ce
 * qu'on attache explicitement — `contexts.custom` (cf. `logger.error`), `extra`,
 * `breadcrumbs[].data` — part tel quel. Une erreur Stripe peut embarquer un
 * `payment_intent` (donc un `client_secret`), et un appelant peut mettre un
 * email/téléphone dans le `context`.
 *
 * Ce module masque, par nom de clé (insensible à la casse et aux séparateurs),
 * les jetons Stripe sensibles et les PII connus, où qu'ils apparaissent dans
 * l'event. Pure function, sans dépendance serveur → importable depuis les 3
 * configs Sentry (server / edge / client).
 */

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;

// Formes normalisées (lowercase, sans `_`/`-`) des clés à masquer.
const SENSITIVE_KEYS = new Set<string>([
	// Jetons / objets Stripe
	"clientsecret",
	"paymentintent",
	"paymentmethod",
	"setupintent",
	"source",
	"charge",
	"raw",
	"headers",
	// Données carte (ne devraient jamais transiter, mais ceinture + bretelles)
	"cvc",
	"cvv",
	"cardnumber",
	"pan",
	// PII
	"email",
	"phone",
	"customeremail",
	"customerphone",
	"shippingphone",
	"billingphone",
	"firstname",
	"lastname",
	"customername",
	"address1",
	"address2",
	"password",
]);

function normalizeKey(key: string): string {
	return key.toLowerCase().replace(/[_-]/g, "");
}

function scrubValue(value: unknown, depth: number): unknown {
	if (depth > MAX_DEPTH || value === null || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map((item) => scrubValue(item, depth + 1));
	}
	const out: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
		out[key] = SENSITIVE_KEYS.has(normalizeKey(key)) ? REDACTED : scrubValue(val, depth + 1);
	}
	return out;
}

/**
 * Masque les clés sensibles dans `contexts`, `extra` et `breadcrumbs[].data`
 * d'un event Sentry. Mute et retourne l'event (signature compatible `beforeSend`,
 * générique pour préserver le type `ErrorEvent` du SDK sans en dépendre).
 */
export function scrubSentryEvent<T>(event: T): T {
	const e = event as {
		contexts?: Record<string, unknown>;
		extra?: Record<string, unknown>;
		breadcrumbs?: Array<{ data?: unknown } | null | undefined>;
	};
	if (e.contexts) {
		e.contexts = scrubValue(e.contexts, 0) as Record<string, unknown>;
	}
	if (e.extra) {
		e.extra = scrubValue(e.extra, 0) as Record<string, unknown>;
	}
	if (Array.isArray(e.breadcrumbs)) {
		e.breadcrumbs = e.breadcrumbs.map((crumb) => {
			const data = crumb?.data;
			if (data && typeof data === "object") {
				return { ...crumb, data: scrubValue(data, 0) as Record<string, unknown> };
			}
			return crumb;
		});
	}
	return event;
}
