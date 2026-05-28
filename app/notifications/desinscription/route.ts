/**
 * EMAIL-AUDIT-001 : endpoint désinscription marketing.
 *
 * Stratégie minimale (sans persistance DB) :
 * - GET  : page de confirmation HTML brandée (UX utilisateur)
 * - POST : 200 silencieux (RFC 8058 One-Click — appelé par les clients mail)
 *
 * Dans les deux cas :
 * 1. Le token HMAC est vérifié contre l'email.
 * 2. Un événement Sentry `marketing-opt-out` est émis avec l'email en tag.
 *    L'admin reçoit l'alerte via le pipeline Sentry standard et propage
 *    manuellement la désinscription (DB / Resend / suppression de la wishlist).
 *
 * Limitation MVP assumée : aucun flag DB ne bloque les futurs envois. Un user
 * désinscrit peut recevoir un nouvel email tant que l'admin n'a pas propagé
 * (cf. CLAUDE.md § Emails).
 */
import * as Sentry from "@sentry/nextjs";
import type { NextRequest } from "next/server";
import { verifyUnsubscribeToken } from "@/modules/notifications/utils/unsubscribe-token";
import { BRAND } from "@/shared/constants/brand";
import { logger } from "@/shared/lib/logger";

function extractParams(
	req: NextRequest,
	formData?: FormData,
): { email: string | null; token: string | null } {
	const url = new URL(req.url);
	const email = url.searchParams.get("email") ?? formData?.get("email")?.toString() ?? null;
	const token = url.searchParams.get("token") ?? formData?.get("token")?.toString() ?? null;
	return { email, token };
}

function recordOptOut(email: string, source: "GET" | "POST"): void {
	logger.warn(
		"[marketing-opt-out] User requested unsubscribe — admin must propagate to mailing list",
		{
			service: "notifications",
			marketingOptOutEmail: email,
			source,
		},
	);
	Sentry.captureMessage("Marketing opt-out request", {
		level: "warning",
		tags: {
			"marketing-opt-out": "true",
			source,
		},
		extra: { email },
	});
}

function renderHtmlPage({ success, email }: { success: boolean; email: string | null }): string {
	const safeEmail = email ? email.replace(/[<>&"]/g, "") : "";
	const title = success ? "Désinscription confirmée" : "Lien invalide";
	const body = success
		? `<p>L'adresse <strong>${safeEmail}</strong> a bien été retirée de nos communications commerciales (back-in-stock, demandes d'avis).</p>
		   <p>Les emails transactionnels (commandes, expédition, factures) continuent d'être envoyés — ils sont indispensables au suivi de vos achats.</p>
		   <p>Si vous avez changé d'avis ou si cette désinscription est une erreur, écrivez-nous à <a href="mailto:${BRAND.contact.email}">${BRAND.contact.email}</a>.</p>`
		: `<p>Le lien de désinscription est invalide ou a été altéré.</p>
		   <p>Si vous souhaitez vous désinscrire des emails commerciaux, envoyez-nous un message à <a href="mailto:${BRAND.contact.email}">${BRAND.contact.email}</a>.</p>`;
	return `<!doctype html>
<html lang="fr">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex,nofollow" />
		<title>${title} — ${BRAND.name}</title>
		<style>
			:root { color-scheme: light dark; }
			body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 540px; margin: 0 auto; padding: 48px 24px; line-height: 1.55; color: #212121; }
			h1 { font-family: Georgia, "Times New Roman", serif; font-size: 28px; margin-bottom: 24px; color: #C4788E; }
			p { margin: 0 0 16px; }
			a { color: #C4788E; }
			footer { margin-top: 48px; font-size: 13px; color: #6B6B6B; }
		</style>
	</head>
	<body>
		<h1>${title}</h1>
		${body}
		<footer>${BRAND.name} — Bijoux artisanaux faits main</footer>
	</body>
</html>`;
}

export async function GET(req: NextRequest): Promise<Response> {
	const { email, token } = extractParams(req);
	const valid = verifyUnsubscribeToken(email, token);
	if (valid && email) {
		recordOptOut(email, "GET");
	}
	return new Response(renderHtmlPage({ success: valid, email }), {
		status: valid ? 200 : 400,
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

export async function POST(req: NextRequest): Promise<Response> {
	let formData: FormData | undefined;
	try {
		formData = await req.formData();
	} catch {
		formData = undefined;
	}
	const { email, token } = extractParams(req, formData);
	const valid = verifyUnsubscribeToken(email, token);
	if (valid && email) {
		recordOptOut(email, "POST");
	}
	// RFC 8058 §3.1 : One-Click POST doit toujours répondre 200 (pas de redirect, pas de body).
	return new Response(null, { status: valid ? 200 : 400 });
}
