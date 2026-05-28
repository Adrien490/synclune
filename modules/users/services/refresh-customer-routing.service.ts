import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";
import { getInvoiceProvider } from "@/modules/invoices/providers/factory";
import type { DirectoryLookupStatus } from "@/modules/invoices/types/invoice-provider";

/**
 * TTL du cache annuaire DGFiP. Au-delà, on déclenche un nouveau lookup au
 * checkout (ou au cron mensuel `refresh-stale-directory-entries`).
 *
 * 30 jours = compromis entre fraîcheur (cas d'un client qui change de PDP)
 * et coût annuaire (limite de débit à respecter).
 */
const DIRECTORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface RefreshCustomerRoutingResult {
	status:
		| "REFRESHED"
		| "CACHE_HIT"
		| "USER_NOT_FOUND"
		| "NOT_B2B"
		| "MISSING_SIRET"
		| "UNAVAILABLE";
	platformId: string | null;
	routingAddress: string | null;
	directoryStatus: DirectoryLookupStatus | null;
}

export interface RefreshCustomerRoutingOptions {
	/** Force le refresh même si le cache TTL n'est pas expiré. */
	force?: boolean;
}

/**
 * Met à jour le cache local des informations annuaire DGFiP pour un user B2B/B2G.
 *
 * Stratégie :
 *  1. Si le user n'est pas B2B/B2G ou n'a pas de SIRET → skip silencieux.
 *  2. Si `directoryLastCheckedAt < now - TTL` ET le SIRET n'a pas changé depuis,
 *     on retourne le cache (sauf `force: true`).
 *  3. Sinon, appel `provider.lookupEInvoicingDirectory({type:'SIRET', value})`.
 *     - `FOUND` → persist `customerEInvoicingPlatformId/Address` + `directoryLastCheckedAt`
 *     - `NOT_FOUND` → persist `null/null` + `directoryLastCheckedAt` (cache négatif)
 *     - `UNAVAILABLE` → ne PAS écrire (préserve le cache existant), retry plus tard
 *
 * Référence : audit Phase 5 EINV-PROVIDER-003.
 */
export async function refreshCustomerRouting(
	userId: string,
	options: RefreshCustomerRoutingOptions = {},
): Promise<RefreshCustomerRoutingResult> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			customerType: true,
			companySiret: true,
			customerEInvoicingPlatformId: true,
			customerEInvoicingAddress: true,
			directoryLastCheckedAt: true,
			directoryLastCheckedSiretSnapshot: true,
		},
	});

	if (!user) {
		return {
			status: "USER_NOT_FOUND",
			platformId: null,
			routingAddress: null,
			directoryStatus: null,
		};
	}

	if (user.customerType !== "B2B" && user.customerType !== "B2G") {
		return {
			status: "NOT_B2B",
			platformId: null,
			routingAddress: null,
			directoryStatus: null,
		};
	}

	const siret = user.companySiret;
	if (!siret) {
		return {
			status: "MISSING_SIRET",
			platformId: null,
			routingAddress: null,
			directoryStatus: null,
		};
	}

	const siretUnchanged = user.directoryLastCheckedSiretSnapshot === siret;
	const cacheAge = user.directoryLastCheckedAt
		? Date.now() - user.directoryLastCheckedAt.getTime()
		: Number.POSITIVE_INFINITY;
	const cacheValid = siretUnchanged && cacheAge < DIRECTORY_TTL_MS;

	if (cacheValid && !options.force) {
		return {
			status: "CACHE_HIT",
			platformId: user.customerEInvoicingPlatformId,
			routingAddress: user.customerEInvoicingAddress,
			directoryStatus: user.customerEInvoicingPlatformId ? "FOUND" : "NOT_FOUND",
		};
	}

	const provider = getInvoiceProvider();
	const lookup = await provider.lookupEInvoicingDirectory({ type: "SIRET", value: siret });

	if (lookup.status === "UNAVAILABLE") {
		logger.warn("Directory lookup unavailable, keeping cache as-is", {
			service: "refresh-customer-routing",
			userId,
			siret,
			provider: provider.id,
		});
		return {
			status: "UNAVAILABLE",
			platformId: user.customerEInvoicingPlatformId,
			routingAddress: user.customerEInvoicingAddress,
			directoryStatus: "UNAVAILABLE",
		};
	}

	const now = new Date();
	await prisma.user.update({
		where: { id: userId },
		data: {
			customerEInvoicingPlatformId: lookup.platformId,
			customerEInvoicingAddress: lookup.routingAddress,
			directoryLastCheckedAt: now,
			directoryLastCheckedSiretSnapshot: siret,
		},
	});

	logger.info(`Directory cache refreshed for user ${userId} → ${lookup.status}`, {
		service: "refresh-customer-routing",
		userId,
		provider: provider.id,
		directoryStatus: lookup.status,
		hasPlatformId: Boolean(lookup.platformId),
	});

	return {
		status: "REFRESHED",
		platformId: lookup.platformId,
		routingAddress: lookup.routingAddress,
		directoryStatus: lookup.status,
	};
}
