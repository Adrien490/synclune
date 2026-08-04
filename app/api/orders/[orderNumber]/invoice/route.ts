import { createHash } from "node:crypto";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { renderInvoicePdf } from "@/modules/invoices/services/render-invoice-pdf";
import { buildInvoiceData } from "@/modules/invoices/services/build-invoice-data";
import { persistInvoiceNumber } from "@/modules/orders/services/persist-invoice-number.service";
import { flagInvoiceFailureForReconcile } from "@/modules/orders/services/ensure-invoice-number.service";
import { archiveInvoicePdf } from "@/modules/orders/services/archive-invoice-pdf.service";
import { verifyInvoiceAccessToken } from "@/modules/orders/utils/invoice-token";
import {
	orderNumberParamSchema,
	invoiceTokenSchema,
} from "@/modules/orders/schemas/order-route-params.schema";
import { isVerifiedAdmin } from "@/modules/auth/lib/require-auth";
import { createOrderAudit } from "@/modules/orders/utils/order-audit";
import { getSession } from "@/modules/auth/lib/get-current-session";
import { GET_ORDER_SELECT_CUSTOMER } from "@/modules/orders/constants/order.constants";
import { checkRateLimit, getRateLimitIdentifier, getClientIp } from "@/shared/lib/rate-limit";
import { ORDER_LIMITS } from "@/shared/lib/rate-limit-config";
import { logger } from "@/shared/lib/logger";
import { isAllowedMediaDomain } from "@/shared/lib/media-validation";
import { prisma, notDeleted } from "@/shared/lib/prisma";
import type { GetOrderReturn } from "@/modules/orders/types/order.types";
import { OrderAction, HistorySource } from "@/app/generated/prisma/client";

/**
 * Timeout fetch UploadThing : si le CDN hang, on retombe sur la régénération
 * contrôlée plutôt que d'attendre le Vercel 504 (60s). Le PDF archivé est
 * normalement servi en quelques centaines de ms — 5s laisse une marge réseau.
 */
const UPLOADTHING_FETCH_TIMEOUT_MS = 5_000;

/**
 * EINV-SEC-002 : audit-trail RGPD Art. 30/32 sur chaque accès facture réussi.
 *
 * Non-bloquant : un échec d'audit ne prive jamais un client de SA facture (droit
 * d'accès à sa propre pièce comptable). Mais — durcissement audit 2026-05-30 —
 * l'échec est désormais escaladé en Sentry `captureException` (niveau error) et
 * non plus avalé en simple `logger.warn` : un trou dans le registre Art. 30/32
 * doit être VISIBLE et rattrapable, pas silencieux. (L'export admin de masse,
 * lui, est fail-closed — cf. `app/api/admin/orders/export/route.ts`.)
 *
 * La source distingue :
 * - ADMIN : session admin, re-vérifiée en base par `isVerifiedAdmin()`
 * - CUSTOMER : owner session ou guest token (`verifyInvoiceAccessToken`)
 * - SYSTEM : devrait être inatteignable ici, garde-fou
 *
 * Pas de PII dans metadata (cf. orderHistoryMetadataSchema garde-fou).
 */
async function recordInvoiceDownload(params: {
	orderId: string;
	invoiceNumber: string | null;
	source: HistorySource;
}): Promise<void> {
	try {
		await createOrderAudit({
			orderId: params.orderId,
			action: OrderAction.INVOICE_DOWNLOADED,
			source: params.source,
			metadata: {
				invoiceNumber: params.invoiceNumber,
				isAdminContext: params.source === HistorySource.ADMIN,
			},
		});
		Sentry.addBreadcrumb({
			category: "invoice",
			message: "invoice-downloaded",
			level: "info",
			data: {
				orderId: params.orderId,
				source: params.source,
				hasInvoiceNumber: !!params.invoiceNumber,
			},
		});
	} catch (error) {
		logger.error("Failed to record INVOICE_DOWNLOADED audit (non-blocking)", error, {
			service: "invoice-route",
			orderId: params.orderId,
			source: params.source,
		});
		Sentry.captureException(error, {
			level: "error",
			tags: { feature: "rgpd-audit", action: "INVOICE_DOWNLOADED" },
			extra: { orderId: params.orderId, source: params.source },
		});
	}
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ orderNumber: string }> },
) {
	const { orderNumber } = await params;
	const url = new URL(request.url);

	// F4 (audit Zod) : params bornés/formatés AVANT session/rate-limit/Prisma
	// (harmonisation avec status/route.ts). Échec → 400.
	const orderNumberValidation = orderNumberParamSchema.safeParse(orderNumber);
	const tokenValidation = invoiceTokenSchema.safeParse(url.searchParams.get("token"));
	if (!orderNumberValidation.success || !tokenValidation.success) {
		return new Response("Bad request", { status: 400 });
	}
	const tokenFromQuery = tokenValidation.data;

	const session = await getSession();

	// Auth modes (any one is sufficient):
	// 1. Admin session — bypasses ownership + rate limit (audit / customer support).
	// 2. Owner session — must match Order.userId.
	// 3. Signed token in `?token=` — covers guest checkouts (Order.userId=null)
	//    where the customer has no session. Token is HMAC-derived from
	//    BETTER_AUTH_SECRET and delivered in the order confirmation email.
	if (!session?.user.id && !tokenFromQuery) {
		return new Response("Non autorisé", { status: 401 });
	}

	// EINV-SEC-008 / EINV-SEC-001 : re-vérification DB du rôle admin (le cookie-cache
	// Better Auth est stale jusqu'à AUTH_SESSION_CONFIG.cookieCache.maxAge). Passe par
	// le helper d'auth partagé — il filtre aussi `suspendedAt` et `accountStatus`, pas
	// seulement le rôle.
	const isAdmin = await isVerifiedAdmin(session, "invoice-route");

	// Rate limit: PDF generation is CPU-intensive.
	// EINV-SEC-004 : admin n'est PLUS bypassé — quota large 200/h anti-exfiltration interne,
	// avec Sentry warning à 80% du quota pour alerte proactive.
	// EINV-SEC-010 : token auth (guest) rate-limit by IP, déjà en place.
	const headersList = await headers();
	const clientIp = await getClientIp(headersList);
	const rateLimitConfig = isAdmin
		? ORDER_LIMITS.ADMIN_INVOICE_DOWNLOAD
		: ORDER_LIMITS.INVOICE_DOWNLOAD;
	const rateLimitIdentifier = session?.user.id
		? isAdmin
			? `admin-invoice:${session.user.id}`
			: getRateLimitIdentifier(session.user.id)
		: `invoice-token:${clientIp ?? "unknown"}`;
	// ⚠️ 3ᵉ argument OBLIGATOIRE : sans lui `effectiveIp` vaut `null` et whitelist,
	// blacklist ET plafond global 100/min/IP sont tous court-circuités. Le préfixe
	// `invoice-token:` défait aussi l'extraction auto de `startsWith("ip:")`, donc
	// passer l'IP explicitement est le SEUL moyen de garder le plafond transverse
	// sur l'opération la plus coûteuse en CPU de l'app. Audit rate limiting 2026-07-31.
	const rateCheck = await checkRateLimit(rateLimitIdentifier, rateLimitConfig, clientIp);
	if (!rateCheck.success) {
		if (isAdmin) {
			Sentry.captureMessage("admin-invoice-download-rate-limited", {
				level: "warning",
				tags: { route: "invoice", actor: "admin" },
				extra: {
					adminUserId: session?.user.id,
					limit: rateLimitConfig.limit,
					windowMs: rateLimitConfig.windowMs,
				},
			});
		}
		return new Response("Trop de requêtes. Veuillez réessayer plus tard.", {
			status: 429,
			headers: {
				"Retry-After": String(rateCheck.retryAfter ?? 60),
			},
		});
	}
	if (isAdmin) {
		const adminLimit = rateLimitConfig.limit ?? 200;
		if (rateCheck.remaining <= Math.floor(adminLimit * 0.2)) {
			Sentry.captureMessage("admin-invoice-download-quota-warning", {
				level: "warning",
				tags: { route: "invoice", actor: "admin" },
				extra: {
					adminUserId: session?.user.id,
					remaining: rateCheck.remaining,
					limit: adminLimit,
				},
			});
		}
	}

	// Direct lookup (no session scope): we apply auth rules below ourselves so
	// the token-bypass path works for guest orders (Order.userId=null) where
	// `getOrder()` would refuse to return anything without a session.
	const order = (await prisma.order.findFirst({
		where: { orderNumber, ...notDeleted },
		select: GET_ORDER_SELECT_CUSTOMER,
	})) as GetOrderReturn | null;
	if (!order) {
		return new Response("Commande introuvable", { status: 404 });
	}

	const tokenValid =
		tokenFromQuery !== null &&
		verifyInvoiceAccessToken(order.id, order.orderNumber, tokenFromQuery);
	// EINV-SEC-003 : 404 (pas 403) sur accès non autorisé — réponse indistincte du
	// cas "commande inexistante" pour ne pas révéler l'existence d'une commande
	// (anti-énumération, défense en profondeur en plus de l'entropie de orderNumber).
	if (!isAdmin && !tokenValid) {
		return new Response("Commande introuvable", { status: 404 });
	}

	// Une facture n'existe que pour une commande ENCAISSÉE (Art. 289-I) — miroir de
	// la garde interne de persistInvoiceNumber. Refuser seulement « jamais
	// encaissée » : un remboursement ne retire pas le droit à la facture (partiel :
	// facture toujours valide ; total : facture VOIDED servie avec le bandeau
	// « FACTURE ANNULÉE », branche isVoidedInvoice plus bas). L'ancienne garde
	// `paymentStatus !== "PAID"` rendait la facture archivée inaccessible dès
	// PARTIALLY_REFUNDED/REFUNDED — et la branche VOIDED inatteignable, puisque
	// voidInvoice n'est appelé que sur des commandes passées REFUNDED/FAILED
	// (audit « Admin commandes » 2026-08-01, P1-A).
	if (order.paidAt == null && order.paymentStatus !== "PAID") {
		return new Response("Facture non disponible pour cette commande", {
			status: 400,
		});
	}

	// Generate and persist invoice number on first download (Article 286 CGI)
	// Fallback : normalement déjà persisté par ensureInvoiceNumberPersisted dans
	// le webhook checkout-completed (ORD-COMPLY-002), mais on garde le lazy path
	// pour les commandes historiques antérieures à ce déploiement.
	let invoiceOrder = order;
	// Audit monitoring 2026-05-28 EINV-OPS-014 : trace observable de la branche
	// empruntée pour servir le PDF (archived / lazy_regenerate / lazy_generate_number).
	type InvoicePath = "archived" | "lazy_regenerate" | "lazy_generate_number";
	let invoicePath: InvoicePath = "archived";
	if (!order.invoiceNumber) {
		invoicePath = "lazy_generate_number";
		const result = await persistInvoiceNumber(order.id);
		if (result) {
			invoiceOrder = {
				...order,
				invoiceNumber: result.invoiceNumber,
				invoiceStatus: "GENERATED" as const,
				invoiceGeneratedAt: result.invoiceGeneratedAt,
			};
		} else {
			// P2 (audit 2026-05-30) : la génération lazy a échoué (5 retries P2002
			// épuisés, overflow séquence, ou throw). Sans numéro, `buildInvoiceData`
			// lèverait plus bas → 500 opaque, ET l'ordre ne serait inscrit dans aucune
			// file de rejeu (seul `alert-stuck-orders` le verrait après 7 j). On pose
			// donc le flag DLQ `invoiceRetryDeferred` (rattrapage automatique par le
			// cron `reconcile-invoices`) + alerte admin, et on renvoie un 503 explicite
			// fail-closed (jamais de facture sans numéro servie — Art. 242 nonies A).
			await flagInvoiceFailureForReconcile(
				order.id,
				"persistInvoiceNumber returned null on lazy invoice download",
			);
			return new Response(
				"Facture en cours de génération, veuillez réessayer dans quelques instants.",
				{ status: 503, headers: { "Retry-After": "60" } },
			);
		}
	}

	// ORD-COMPLY-005 : servir le PDF archivé immuable si déjà uploadé.
	// invoicePdfUrl n'est pas dans GET_ORDER_SELECT_CUSTOMER (minimisation) — on
	// fait un select dédié ici. Si setté, on stream depuis UploadThing au lieu de
	// régénérer (garantit l'immuabilité bit-à-bit, Art. L102 B LPF).
	const archive = await prisma.order.findUnique({
		where: { id: order.id },
		select: {
			invoicePdfUrl: true,
			invoicePdfHash: true,
			// F6 (RGPD-PII-AUDIT 2026-05-30) : marqueur de purge PII à 10 ans.
			piiPurgedAt: true,
		},
	});

	// F6 (RGPD-PII-AUDIT 2026-05-30) : une fois la PII purgée à `paidAt + 10 ans`
	// (hard-delete-retention), la facture n'est plus reconstituable — snapshot et PDF
	// archivé effacés (base légale de conservation expirée, RGPD Art. 5.1.e). Sans cette
	// garde, on retomberait sur la régénération depuis les colonnes Order scrubées
	// (« Client supprimé »/« Adresse supprimée ») → PDF corrompu ou 503 opaque. On renvoie
	// un 410 Gone explicite : le document a légalement cessé d'exister.
	if (archive?.piiPurgedAt) {
		return new Response(
			"Ce document n'est plus disponible : la durée légale de conservation (10 ans) a expiré.",
			{ status: 410 },
		);
	}

	// Source de l'audit-trail EINV-SEC-002.
	const auditSource: HistorySource = isAdmin ? HistorySource.ADMIN : HistorySource.CUSTOMER;

	// EINV-SEC-007 : si la facture est VOIDED, on régénère systématiquement
	// pour incruster le bandeau "FACTURE ANNULÉE — Avoir A-YYYY-NNNNN" (Art. 272-I CGI).
	// L'archive UploadThing reste consultable pour l'audit fiscal admin via la table
	// Order.invoicePdfUrl, mais n'est PLUS servie au client (risque qu'il l'attache à
	// sa déclaration comme valide). Le check d'intégrité d'hash est également bypass
	// pour cette raison (le PDF régénéré diverge par design).
	const isVoidedInvoice = invoiceOrder.invoiceStatus === "VOIDED";

	if (!isVoidedInvoice && archive?.invoicePdfUrl) {
		// EINV-PDF-005 : whitelist host UploadThing avant fetch (anti-SSRF). Si la
		// DB est compromise (admin / dépendance malveillante), le serveur ne doit
		// PAS fetcher un endpoint arbitraire (metadata cloud, intranet).
		if (!isAllowedMediaDomain(archive.invoicePdfUrl)) {
			logger.error("invoicePdfUrl is not on UploadThing whitelist — refusing fetch", undefined, {
				service: "invoice-route",
				orderId: order.id,
				host: safeHostname(archive.invoicePdfUrl),
			});
			Sentry.captureMessage("invoice-pdf-url-host-not-whitelisted", {
				level: "error",
				tags: { service: "invoice-route" },
				extra: { orderId: order.id, host: safeHostname(archive.invoicePdfUrl) },
			});
			return new Response("Configuration facture invalide", { status: 500 });
		}

		try {
			// EINV-PDF-004 : AbortSignal timeout 5s pour éviter le 504 Vercel
			// si UploadThing hang.
			const archived = await fetch(archive.invoicePdfUrl, {
				cache: "no-store",
				signal: AbortSignal.timeout(UPLOADTHING_FETCH_TIMEOUT_MS),
			});
			if (archived.ok) {
				const buffer = await archived.arrayBuffer();
				// EINV-PDF-006 : re-vérifier l'empreinte de l'artefact effectivement servi
				// contre le hash archivé (Art. L102 B LPF). Jusqu'ici le `invoicePdfHash`
				// n'avait de valeur de preuve d'intégrité que sur le fallback de
				// régénération (:339) — le chemin de lecture réel (octets UploadThing)
				// n'était jamais vérifié. On garde donc ce chemin contre une corruption
				// ou altération silencieuse côté CDN. En cas de divergence : on NE sert
				// PAS l'octet douteux — on bascule sur la régénération depuis le snapshot
				// figé (elle-même re-vérifiée vs ce hash plus bas, 503 si elle diverge
				// aussi). Archives legacy sans hash : servies telles quelles (pas de régression).
				const servedHash =
					archive.invoicePdfHash != null
						? createHash("sha256").update(new Uint8Array(buffer)).digest("hex")
						: null;
				if (servedHash !== null && servedHash !== archive.invoicePdfHash) {
					logger.error(
						"Archived invoice PDF hash mismatch — falling back to regeneration",
						undefined,
						{
							service: "invoice-route",
							orderId: order.id,
							invoiceNumber: invoiceOrder.invoiceNumber ?? undefined,
							archivedHash: archive.invoicePdfHash,
							servedHash,
						},
					);
					Sentry.captureMessage("invoice-pdf-archive-hash-mismatch", {
						level: "error",
						fingerprint: [
							"invoice",
							"archive-hash-mismatch",
							invoiceOrder.invoiceNumber ?? "unknown",
						],
						tags: { service: "invoice-route" },
						extra: {
							orderId: order.id,
							invoiceNumber: invoiceOrder.invoiceNumber,
							archivedHash: archive.invoicePdfHash,
							servedHash,
						},
					});
					invoicePath = "lazy_regenerate";
					// Pas de return : on tombe dans le bloc de régénération existant (:297+).
				} else {
					Sentry.setTag("invoice_path", invoicePath);
					Sentry.addBreadcrumb({
						category: "invoice",
						level: "info",
						message: `Invoice served via ${invoicePath}`,
						data: { orderId: order.id, invoicePath },
					});
					await recordInvoiceDownload({
						orderId: order.id,
						invoiceNumber: invoiceOrder.invoiceNumber,
						source: auditSource,
					});
					return new Response(buffer, {
						headers: buildPdfHeaders(invoiceOrder.invoiceNumber, orderNumber),
					});
				}
			}
			invoicePath = "lazy_regenerate";
			logger.warn(
				`Archived invoice fetch failed (${archived.status}) — falling back to regeneration`,
				{ service: "invoice-route", orderId: order.id, invoicePath },
			);
		} catch (error) {
			invoicePath = "lazy_regenerate";
			logger.warn(`Archived invoice fetch threw — falling back to regeneration`, {
				service: "invoice-route",
				orderId: order.id,
				invoicePath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	} else if (invoicePath !== "lazy_generate_number") {
		invoicePath = "lazy_regenerate";
	}

	// ⚠️ CHEMIN DE DÉPANNAGE, pas le chemin nominal. Le document qui fait foi est
	// le PDF ARCHIVÉ, servi plus haut et vérifié contre `invoicePdfHash`
	// (EINV-PDF-006). On n'arrive ici que si l'archive manque ou est illisible.
	//
	// Depuis le retrait du snapshot de données (2026-08-05), cette régénération
	// reconstruit la facture depuis les colonnes VIVANTES et depuis l'identité
	// vendeur COURANTE (env) : elle peut donc diverger de l'original si l'une ou
	// l'autre a changé. C'est assumé — mais c'est ce qui rend l'archivage
	// non-négociable, et c'est pourquoi `reconcile-invoices` reprend en boucle
	// toute facture numérotée sans `invoicePdfUrl`.
	let pdfBuffer: ArrayBuffer;
	try {
		let invoiceData = buildInvoiceData(invoiceOrder);
		// Le bandeau « FACTURE ANNULÉE » est dérivé des colonnes vivantes : la date
		// d'annulation est celle de l'avoir qui la porte (`creditNoteGeneratedAt`).
		if (
			isVoidedInvoice &&
			invoiceData.voidedInfo === null &&
			invoiceOrder.creditNoteNumber &&
			invoiceOrder.creditNoteGeneratedAt
		) {
			invoiceData = {
				...invoiceData,
				voidedInfo: {
					creditNoteNumber: invoiceOrder.creditNoteNumber,
					voidedAt: invoiceOrder.creditNoteGeneratedAt,
				},
			};
		}
		pdfBuffer = renderInvoicePdf(invoiceData);
	} catch (error) {
		throw error;
	}

	// EINV-PDF-002 : si une archive existe avec un hash connu, refuser de servir
	// un PDF régénéré qui diverge (un déploiement intermédiaire a pu changer
	// le template/SDK jsPDF). Le service est tenu à la restitution à l'identique
	// (Art. L102 B LPF). Préférer un 503 + Retry-After plutôt que de servir un
	// PDF non conforme au fichier comptable archivé.
	// EINV-SEC-007 : bypass pour les factures VOIDED — le bandeau ANNULÉE incrusté
	// fait diverger l'hash par design.
	if (!isVoidedInvoice && archive?.invoicePdfHash) {
		const regeneratedHash = createHash("sha256").update(new Uint8Array(pdfBuffer)).digest("hex");
		if (regeneratedHash !== archive.invoicePdfHash) {
			logger.error(
				"Regenerated invoice PDF hash diverges from archived hash — refusing to serve",
				undefined,
				{
					service: "invoice-route",
					orderId: order.id,
					invoiceNumber: invoiceOrder.invoiceNumber ?? undefined,
					archivedHash: archive.invoicePdfHash,
					regeneratedHash,
				},
			);
			Sentry.captureMessage("invoice-pdf-hash-divergence", {
				level: "error",
				fingerprint: ["invoice", "hash-mismatch", invoiceOrder.invoiceNumber ?? "unknown"],
				tags: { service: "invoice-route" },
				extra: {
					orderId: order.id,
					invoiceNumber: invoiceOrder.invoiceNumber,
					archivedHash: archive.invoicePdfHash,
					regeneratedHash,
				},
			});
			return new Response(
				"Facture temporairement indisponible (vérification d'intégrité en cours).",
				{ status: 503, headers: { "Retry-After": "60" } },
			);
		}
	}

	// Archive sur UploadThing si invoiceNumber présent (best-effort, ne bloque pas).
	if (invoiceOrder.invoiceNumber) {
		await archiveInvoicePdf(order.id, invoiceOrder.invoiceNumber, pdfBuffer);
	}

	// `invoicePath` est forcément lazy ici (l'archive a été servie + return plus haut
	// sinon). Le tag warning matérialise le signal opérationnel attendu (EINV-OPS-014).
	Sentry.setTag("invoice_path", invoicePath);
	Sentry.addBreadcrumb({
		category: "invoice",
		level: "warning",
		message: `Invoice served via ${invoicePath}`,
		data: { orderId: order.id, invoicePath },
	});

	await recordInvoiceDownload({
		orderId: order.id,
		invoiceNumber: invoiceOrder.invoiceNumber,
		source: auditSource,
	});

	return new Response(pdfBuffer, {
		headers: buildPdfHeaders(invoiceOrder.invoiceNumber, orderNumber, {
			voided: isVoidedInvoice,
		}),
	});
}

function safeHostname(rawUrl: string): string {
	try {
		return new URL(rawUrl).hostname;
	} catch {
		return "<invalid-url>";
	}
}

function buildPdfHeaders(
	invoiceNumber: string | null,
	orderNumber: string,
	options: { voided?: boolean } = {},
): HeadersInit {
	const filename = invoiceNumber ? `facture-${invoiceNumber}.pdf` : `facture-${orderNumber}.pdf`;
	return {
		"Content-Type": "application/pdf",
		"Content-Disposition": `attachment; filename="${filename}"`,
		// EINV-SEC-007 : si VOIDED, cache courte vie côté client (pour permettre
		// au customer de re-télécharger si on regénère le bandeau). Sinon : 1 an
		// immuable (Art. L102 B LPF — facture figée bit-à-bit).
		"Cache-Control": options.voided
			? "private, max-age=0, must-revalidate"
			: "private, max-age=31536000, immutable",
		"X-Frame-Options": "DENY",
		"X-Content-Type-Options": "nosniff",
		"Referrer-Policy": "no-referrer",
		// EINV-SEC-007 : signal côté client pour différencier l'UI.
		...(options.voided ? { "X-Invoice-Status": "VOIDED" } : {}),
	};
}
