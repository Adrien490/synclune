/**
 * Détecteur de spam pour les avis clients (service pur, sans I/O).
 *
 * Couche complémentaire à `sanitizeText` (XSS) + rate-limit (1/24h par user).
 * Refuse l'avis si match heuristique :
 *   - URL externe au domaine Synclune (synclune.fr | localhost dev).
 *   - Numéro de téléphone FR/international (E.164 + variantes courantes).
 *   - Mot-clé black-listé (spam commercial, scams classiques FR/EN).
 *
 * Volontairement minimaliste — pas d'API externe, pas de ML. Tunable via constants.
 * Audit reviews 2026-05-11 P2.1.
 */

export interface SpamDetectionResult {
	isSpam: boolean;
	reasons: SpamReason[];
}

type SpamReason =
	"external_url" | "phone_number" | "blacklisted_keyword" | "excessive_caps" | "repeated_chars";

const ALLOWED_DOMAINS = ["synclune.fr", "www.synclune.fr", "localhost"];

// URL regex large : http(s):// ou www. ou domaine.tld
const URL_PATTERN = /(?:https?:\/\/|www\.|\b)([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:\/[^\s]*)?/gi;

// Téléphones : E.164 (+33 6 12 ...), variantes FR (0612345678, 06.12.34.56.78),
// génériques internationaux (+1, +44, etc.)
const PHONE_PATTERN =
	/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}|0[1-9](?:[\s.-]?\d{2}){4}/g;

// Mots-clés spam (insensible à la casse).
// Liste courte volontairement — étendre via audit si faux positifs.
const BLACKLIST_KEYWORDS = [
	// Scam crypto / financier
	"crypto",
	"bitcoin",
	"trading",
	"forex",
	"investissement garanti",
	"gagner de l'argent",
	"make money",
	"earn cash",
	// Pharma / SEO spam
	"viagra",
	"cialis",
	"replica watch",
	// CTAs commerciaux frauduleux
	"cliquez ici",
	"click here",
	"visitez mon site",
	"visit my website",
	"contactez-moi sur",
	"contact me at",
	"whatsapp:",
	"telegram:",
	// Concurrents abusifs (générique)
	"meilleur que",
	"better than synclune",
];

const MIN_LENGTH_FOR_CAPS_CHECK = 20;
const CAPS_RATIO_THRESHOLD = 0.6; // > 60% majuscules sur un contenu > 20 chars

const REPEATED_CHAR_PATTERN = /(.)\1{5,}/; // ex. "aaaaaa" ou "!!!!!!"

function isExternalUrl(match: string): boolean {
	const lower = match.toLowerCase();
	return !ALLOWED_DOMAINS.some((d) => lower.includes(d));
}

function containsBlacklistedKeyword(content: string): boolean {
	const lower = content.toLowerCase();
	return BLACKLIST_KEYWORDS.some((kw) => lower.includes(kw));
}

function isExcessiveCaps(content: string): boolean {
	if (content.length < MIN_LENGTH_FOR_CAPS_CHECK) return false;
	const letters = content.replace(/[^a-zA-ZÀ-ÿ]/g, "");
	if (letters.length === 0) return false;
	const upper = letters.replace(/[^A-ZÀ-Þ]/g, "");
	return upper.length / letters.length > CAPS_RATIO_THRESHOLD;
}

/**
 * Analyse `title + content` pour détecter du spam.
 * Le titre est optionnel — concaténé avec un saut de ligne s'il existe.
 */
export function detectReviewSpam(input: {
	title?: string | null;
	content: string;
}): SpamDetectionResult {
	const text = [input.title, input.content].filter(Boolean).join("\n");
	const reasons: SpamReason[] = [];

	// URLs externes
	const urlMatches = text.match(URL_PATTERN);
	if (urlMatches?.some(isExternalUrl)) {
		reasons.push("external_url");
	}

	// Téléphones
	if (PHONE_PATTERN.test(text)) {
		reasons.push("phone_number");
	}
	PHONE_PATTERN.lastIndex = 0; // reset (global regex)

	// Mots-clés
	if (containsBlacklistedKeyword(text)) {
		reasons.push("blacklisted_keyword");
	}

	// Majuscules abusives (>60% sur contenu long)
	if (isExcessiveCaps(text)) {
		reasons.push("excessive_caps");
	}

	// Répétitions (ex. "aaaaaaaa" "!!!!!!!")
	if (REPEATED_CHAR_PATTERN.test(text)) {
		reasons.push("repeated_chars");
	}

	return {
		isSpam: reasons.length > 0,
		reasons,
	};
}
