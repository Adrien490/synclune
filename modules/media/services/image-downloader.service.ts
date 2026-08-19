/**
 * Image download service with retry and validation.
 *
 * Provides shared utilities for:
 * - Downloading with timeout and size validation
 * - Retry with exponential backoff
 * - Retryable error detection
 *
 * @module modules/media/services/image-downloader.service
 */

import sharp from "sharp";
import { withRetry as withRetryBase } from "@/shared/utils/with-retry";
import type { DownloadImageOptions, RetryOptions } from "../types/image-processing.types";
import { IMAGE_DOWNLOADER_CONFIG } from "../constants/image-downloader.constants";

// ============================================================================
// ERRORS
// ============================================================================

/**
 * Échec DÉTERMINISTE de téléchargement : re-tenter ne peut PAS réussir
 * (cible privée bloquée, redirection refusée, Content-Type non image,
 * dépassement du plafond de taille).
 *
 * Sans ce typage, le défaut « erreur inconnue ⇒ retry » de `isRetryableError`
 * faisait re-tenter 3× des échecs garantis — leurs messages ne matchent ni le
 * motif `HTTP \d{3}` ni les mots-clés réseau.
 */
export class NonRetryableDownloadError extends Error {
	constructor(message: string, cause?: unknown) {
		super(message);
		this.name = "NonRetryableDownloadError";
		this.cause = cause;
	}
}

/**
 * Le contenu téléchargé n'est PAS une image décodable (magic bytes invalides).
 *
 * Distinct d'une erreur réseau/timeout : signale un MIME spoofé (exécutable ou
 * HTML renommé `.jpg`) ou un format sans codec disponible dans le build Sharp
 * (HEIC sans libheif). Les appelants DOIVENT rejeter l'upload sur cette erreur —
 * la traiter comme un incident transitoire laisserait passer le fichier.
 */
export class ImageDecodeError extends Error {
	constructor(cause?: unknown) {
		super("Contenu illisible : le fichier n'est pas une image décodable");
		this.name = "ImageDecodeError";
		this.cause = cause;
	}
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Truncates a URL for logging (avoids exposing too much info)
 */
export function truncateUrl(url: string, maxLength: number = 50): string {
	if (url.length <= maxLength) return url;
	return url.substring(0, maxLength) + "...";
}

/**
 * Determines if an error is temporary and worth retrying.
 * - 5xx errors (server) -> retry
 * - Timeout/AbortError -> retry
 * - Network errors -> retry
 * - 4xx errors (client) -> no retry (permanent error)
 * - Typed deterministic errors (SSRF, Content-Type, redirect, size, decode) -> no retry
 */
export function isRetryableError(error: unknown): boolean {
	if (!(error instanceof Error)) return true; // Unknown error, retry

	// Échecs déterministes typés : re-télécharger ne changera rien.
	if (error instanceof NonRetryableDownloadError) return false;
	if (error instanceof ImageDecodeError) return false;

	const message = error.message.toLowerCase();

	// Timeout or abort -> retry
	if (error.name === "AbortError" || message.includes("timeout")) {
		return true;
	}

	// HTTP errors: extract status code
	const httpMatch = message.match(/http\s*(\d{3})/i);
	if (httpMatch) {
		const statusCode = parseInt(httpMatch[1]!, 10);
		// 4xx = permanent client error (except 408 Request Timeout, 429 Too Many Requests)
		if (statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429) {
			return false;
		}
		// 5xx = temporary server error
		return true;
	}

	// Network errors -> retry
	if (
		message.includes("network") ||
		message.includes("econnrefused") ||
		message.includes("econnreset") ||
		message.includes("etimedout")
	) {
		return true;
	}

	// Default to retry (cautious approach)
	return true;
}

/**
 * Image-aware retry wrapper. Pre-configures the shared withRetry utility
 * with isRetryableError to skip retries on permanent HTTP 4xx errors
 * and typed deterministic errors (NonRetryableDownloadError, ImageDecodeError).
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	return withRetryBase(fn, {
		maxAttempts: options.maxRetries ?? IMAGE_DOWNLOADER_CONFIG.MAX_RETRIES,
		baseDelay: options.baseDelay ?? IMAGE_DOWNLOADER_CONFIG.RETRY_BASE_DELAY_MS,
		isRetryable: isRetryableError,
		jitter: false,
	});
}

// ============================================================================
// SSRF PROTECTION
// ============================================================================

/**
 * Blocks requests to private/internal IP ranges (RFC 1918, loopback, link-local,
 * CGNAT, IETF protocol assignments, etc.)
 * Prevents SSRF attacks that could target internal services.
 */
function isPrivateHostname(hostname: string): boolean {
	// Loopback
	if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
		return true;
	}

	// IPv4 private ranges
	const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (ipv4Match) {
		const [, a, b, c] = ipv4Match.map(Number) as [number, number, number, number, number];
		// 10.0.0.0/8
		if (a === 10) return true;
		// 100.64.0.0/10 — CGNAT (RFC 6598) : espace « partagé » des FAI, interne de fait
		if (a === 100 && b! >= 64 && b! <= 127) return true;
		// 172.16.0.0/12
		if (a === 172 && b! >= 16 && b! <= 31) return true;
		// 192.0.0.0/24 — IETF protocol assignments (RFC 6890), jamais routable public
		if (a === 192 && b === 0 && c === 0) return true;
		// 192.168.0.0/16
		if (a === 192 && b === 168) return true;
		// 169.254.0.0/16 (link-local / cloud metadata)
		if (a === 169 && b === 254) return true;
		// 0.0.0.0
		if (a === 0) return true;
	}

	// IPv6 private ranges (strip brackets for URL-style [::1])
	const ipv6 = hostname.startsWith("[") ? hostname.slice(1, -1) : hostname;
	const lower = ipv6.toLowerCase();

	// IPv4-mapped IPv6 (::ffff:127.0.0.1, ::ffff:10.0.0.1, etc.)
	if (lower.startsWith("::ffff:")) {
		const mapped = lower.slice(7);
		// Recurse with the mapped IPv4 address
		if (isPrivateHostname(mapped)) return true;
	}

	// fc00::/7 — Unique Local Addresses (includes fd00::/8)
	if (lower.startsWith("fc") || lower.startsWith("fd")) return true;

	// fe80::/10 — Link-local
	if (lower.startsWith("fe80")) return true;

	// :: (unspecified address, equivalent to 0.0.0.0)
	if (lower === "::") return true;

	return false;
}

// ============================================================================
// BODY READING
// ============================================================================

function buildSizeError(actualBytes: number, maxSize: number): NonRetryableDownloadError {
	return new NonRetryableDownloadError(
		`Image trop volumineuse: ${(actualBytes / 1024 / 1024).toFixed(2)}MB (max: ${(maxSize / 1024 / 1024).toFixed(0)}MB)`,
	);
}

/**
 * Détecte le refus de redirection d'undici : avec `redirect: "error"`, fetch
 * rejette un TypeError générique « fetch failed » dont la CAUSE porte
 * « unexpected redirect ». On remonte la chaîne des causes plutôt que de
 * dépendre d'un message de premier niveau figé.
 */
function isRedirectRefusal(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
		if (current.message.toLowerCase().includes("redirect")) return true;
		current = current.cause;
	}
	return false;
}

/**
 * Lit le corps en FLUX en cumulant les chunks, et coupe dès que le cumul
 * dépasse `maxSize`. Sans cela, `response.arrayBuffer()` bufferiserait la
 * réponse ENTIÈRE avant le contrôle de taille : un serveur sans
 * `content-length` (ou avec un header menteur) ferait allouer bien plus
 * que le plafond.
 */
async function readBodyWithLimit(
	response: Response,
	maxSize: number,
	controller: AbortController,
): Promise<Buffer> {
	// Corps absent (réponse vide ou environnement mocké sans stream) :
	// repli bufferisé — le plafond reste contrôlé après lecture.
	if (!response.body) {
		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.length > maxSize) throw buildSizeError(buffer.length, maxSize);
		return buffer;
	}

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxSize) {
			// Couper la CONNEXION, pas seulement la lecture : sans abort,
			// undici continuerait à recevoir le flux en arrière-plan.
			controller.abort();
			throw buildSizeError(total, maxSize);
		}
		chunks.push(value);
	}
	return Buffer.concat(chunks);
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Downloads an image and returns the buffer.
 *
 * ⚠️ Cette fonction SUPPOSE un hôte déjà allowlisté en amont
 * (`isValidUploadThingUrl`, app/api/uploadthing/core.ts) : les gardes locales
 * (IP privées, redirections refusées, plafond lu en flux) sont de la défense
 * en profondeur, pas la validation principale. Toute redirection fait ÉCHOUER
 * le download (`redirect: "error"`) — suivre un 3xx re-pointerait la requête
 * vers une cible jamais re-validée (SSRF via redirect).
 *
 * @param url - URL of the image to download
 * @param options - Download options
 * @throws {NonRetryableDownloadError} Cible privée, redirection, Content-Type non image, taille dépassée
 * @throws {ImageDecodeError} Contenu non décodable (MIME spoofé)
 * @throws {Error} Erreurs réseau/HTTP transitoires (retryables via `withRetry`)
 */
export async function downloadImage(
	url: string,
	options: DownloadImageOptions = {},
): Promise<Buffer> {
	// SSRF protection: block private/internal IP ranges
	const parsedUrl = new URL(url);
	if (isPrivateHostname(parsedUrl.hostname)) {
		throw new NonRetryableDownloadError(
			`SSRF blocked: private/internal hostname "${parsedUrl.hostname}"`,
		);
	}

	const timeout = options.downloadTimeout ?? IMAGE_DOWNLOADER_CONFIG.DOWNLOAD_TIMEOUT_MS;
	const maxSize = options.maxImageSize ?? IMAGE_DOWNLOADER_CONFIG.MAX_IMAGE_SIZE;
	const userAgent = options.userAgent ?? IMAGE_DOWNLOADER_CONFIG.USER_AGENT;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		let response: Response;
		try {
			response = await fetch(url, {
				signal: controller.signal,
				// L'hôte a été validé AVANT ce fetch ; suivre une redirection
				// enverrait la requête vers une cible jamais re-validée.
				redirect: "error",
				headers: {
					"User-Agent": userAgent,
				},
			});
		} catch (err) {
			if (isRedirectRefusal(err)) {
				throw new NonRetryableDownloadError(
					`Redirection refusée: ${truncateUrl(url)} (les redirections ne sont pas suivies — la cible ne serait pas re-validée)`,
					err,
				);
			}
			throw err;
		}

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		// Verify Content-Type (security: avoid downloading HTML/JSON)
		const contentType = response.headers.get("content-type");
		if (!contentType?.startsWith("image/")) {
			throw new NonRetryableDownloadError(
				`Content-Type invalide: ${contentType ?? "absent"} (image/* attendu)`,
			);
		}

		// Fast-path : un content-length honnête permet de refuser avant de lire le corps
		const contentLength = response.headers.get("content-length");
		if (contentLength && parseInt(contentLength, 10) > maxSize) {
			throw buildSizeError(parseInt(contentLength, 10), maxSize);
		}

		// Lecture en flux avec plafond : le header content-length peut mentir ou manquer
		const buffer = await readBodyWithLimit(response, maxSize, controller);

		// Validate magic bytes via Sharp metadata (defense-in-depth beyond Content-Type header).
		// Typé en ImageDecodeError pour que l'appelant distingue « MIME spoofé » (rejeter)
		// de « incident réseau » (best-effort) — cf. app/api/uploadthing/core.ts.
		try {
			await sharp(buffer).metadata();
		} catch (err) {
			throw new ImageDecodeError(err);
		}

		return buffer;
	} finally {
		clearTimeout(timeoutId);
	}
}
