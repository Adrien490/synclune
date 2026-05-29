import { createHash } from "node:crypto";
import { headers } from "next/headers";
import * as Sentry from "@sentry/nextjs";
import { resolveInvoiceDataForRender } from "@/modules/invoices/services/resolve-invoice-data";
import { InvoiceSnapshotIntegrityError } from "@/modules/invoices/services/verify-invoice-snapshot";
import { renderInvoicePdf } from "@/modules/invoices/services/render-invoice-pdf";
import { persistInvoiceNumber } from "@/modules/orders/services/persist-invoice-number.service";
import { archiveInvoicePdf } from "@/modules/orders/services/archive-invoice-pdf.service";
import { verifyInvoiceAccessToken } from "@/modules/orders/utils/invoice-token";
import { resolveInvoiceActorIsAdmin } from "@/modules/orders/utils/resolve-invoice-admin";
import { isInvoiceOwnerErased } from "@/modules/orders/utils/invoice-access-guard";
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
 * Best-effort : échec audit ne bloque jamais le download. La source distingue :
 * - ADMIN : session admin (re-vérifiée DB côté caller via session.user.role)
 * - CUSTOMER : owner session ou guest token (`verifyInvoiceAccessToken`)
 * - SYSTEM : devrait être inatteignable ici, garde-fou
 *
 * Pas de PII dans metadata (cf. orderHistoryMetadataSchema garde-fou).
 */
async function recordInvoiceDownload(params: {
	orderId: string;
	invoiceNumber: string | null;
	authorId: string | undefined;
	source: HistorySource;
}): Promise<void> {
	try {
		await createOrderAudit({
			orderId: params.orderId,
			action: OrderAction.INVOICE_DOWNLOADED,
			authorId: params.authorId,
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
		logger.warn("Failed to record INVOICE_DOWNLOADED audit (best-effort)", {
			service: "invoice-route",
			orderId: params.orderId,
			source: params.source,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ orderNumber: string }> },
) {
	const { orderNumber } = await params;
	const url = new URL(request.url);
	const tokenFromQuery = url.searchParams.get("token");

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

	// EINV-SEC-008 / EINV-SEC-001 : re-vérification DB du rôle admin (cookie-cache
	// Better Auth stale jusqu'à ~5 min). Helper partagé avec les routes avoir.
	const isAdmin = await resolveInvoiceActorIsAdmin(session, "invoice-route");

	// Rate limit: PDF generation is CPU-intensive.
	// EINV-SEC-004 : admin n'est PLUS bypassé — quota large 200/h anti-exfiltration interne,
	// avec Sentry warning à 80% du quota pour alerte proactive.
	// EINV-SEC-010 : token auth (guest) rate-limit by IP, déjà en place.
	const headersList = await headers();
	const rateLimitConfig = isAdmin
		? ORDER_LIMITS.ADMIN_INVOICE_DOWNLOAD
		: ORDER_LIMITS.INVOICE_DOWNLOAD;
	const rateLimitIdentifier = session?.user.id
		? isAdmin
			? `admin-invoice:${session.user.id}`
			: getRateLimitIdentifier(session.user.id)
		: `invoice-token:${(await getClientIp(headersList)) ?? "unknown"}`;
	const rateCheck = await checkRateLimit(rateLimitIdentifier, rateLimitConfig);
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
	const sessionOwns = !!session?.user.id && order.userId === session.user.id;
	// EINV-SEC-003 : 404 (pas 403) sur accès non autorisé — réponse indistincte du
	// cas "commande inexistante" pour ne pas révéler l'existence d'une commande
	// (anti-énumération, défense en profondeur en plus de l'entropie de orderNumber).
	if (!isAdmin && !sessionOwns && !tokenValid) {
		return new Response("Commande introuvable", { status: 404 });
	}

	// EINV-SEC-002 : l'accès restant non-admin/non-owner est forcément par token.
	// Une fois le compte propriétaire anonymisé (RGPD Art. 17), on révoque le token
	// permanent : il ne doit plus servir le PDF figé contenant l'identité d'origine.
	if (!isAdmin && !sessionOwns && (await isInvoiceOwnerErased(order.userId))) {
		return new Response("Ce document n'est plus accessible (compte supprimé).", {
			status: 410,
		});
	}

	if (order.paymentStatus !== "PAID") {
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
		const result = await persistInvoiceNumber(order.id, order.userId);
		if (result) {
			invoiceOrder = {
				...order,
				invoiceNumber: result.invoiceNumber,
				invoiceStatus: "GENERATED" as const,
				invoiceGeneratedAt: result.invoiceGeneratedAt,
			};
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
			// EINV-PDF-001 : snapshot figé pour le rendu de fallback (cf. plus bas).
			// Pas dans GET_ORDER_SELECT_CUSTOMER (minimisation) — select ciblé ici.
			invoiceDataSnapshot: true,
			invoiceDataHash: true,
		},
	});
	// Source de l'audit-trail EINV-SEC-002.
	const auditSource: HistorySource = isAdmin ? HistorySource.ADMIN : HistorySource.CUSTOMER;
	const auditAuthorId = session?.user.id;

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
						authorId: auditAuthorId,
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

	// EINV-PDF-001 : rendre depuis le snapshot figé (`invoiceDataSnapshot`) en
	// priorité, jamais depuis une recomputation des colonnes Order live. Le
	// resolver vérifie aussi l'intégrité (SHA-256 canonical-JSON vs
	// `invoiceDataHash`) — EINV-PDF-003.
	let pdfBuffer: ArrayBuffer;
	try {
		pdfBuffer = renderInvoicePdf(
			resolveInvoiceDataForRender(invoiceOrder, {
				invoiceDataSnapshot: archive?.invoiceDataSnapshot,
				invoiceDataHash: archive?.invoiceDataHash,
			}),
		);
	} catch (error) {
		if (error instanceof InvoiceSnapshotIntegrityError) {
			// Snapshot comptable corrompu/altéré : refuser de servir un document
			// non conforme (Art. L102 B LPF) plutôt que de rendre des données
			// divergentes. Alerte Sentry pour investigation manuelle.
			logger.error("Invoice snapshot integrity check failed — refusing to render", error, {
				service: "invoice-route",
				orderId: order.id,
				invoiceNumber: invoiceOrder.invoiceNumber ?? undefined,
			});
			Sentry.captureException(error, {
				fingerprint: ["invoice", "snapshot-integrity", invoiceOrder.invoiceNumber ?? "unknown"],
				tags: { service: "invoice-route" },
				extra: { orderId: order.id, invoiceNumber: invoiceOrder.invoiceNumber },
			});
			return new Response(
				"Facture temporairement indisponible (vérification d'intégrité en cours).",
				{ status: 503, headers: { "Retry-After": "60" } },
			);
		}
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
		authorId: auditAuthorId,
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
