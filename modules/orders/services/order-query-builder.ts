import type { Prisma } from "@/app/generated/prisma/client";
import { escapeLikePattern } from "@/shared/utils/escape-like-pattern";
import type { GetOrdersParams } from "../schemas/order.schemas";

/**
 * Recherche admin : email (contains, échappé — `contains` Prisma n'échappe pas
 * `% _ \`) OU numéro de facture exact quand le terme est numérique OU id exact
 * (coller un id de commande depuis un email d'alerte doit retrouver la ligne).
 */
export function buildOrderSearchConditions(search: string): Prisma.OrderWhereInput {
	const term = search.trim();
	const conditions: Prisma.OrderWhereInput[] = [
		{ email: { contains: escapeLikePattern(term), mode: "insensitive" } },
		{ id: term },
	];

	if (/^\d{1,9}$/.test(term)) {
		conditions.push({ invoiceNumber: Number(term) });
	}

	return { OR: conditions };
}

export function buildOrderWhereClause(
	params: Pick<GetOrdersParams, "search" | "filters">,
): Prisma.OrderWhereInput {
	const conditions: Prisma.OrderWhereInput[] = [];

	if (params.search?.trim()) {
		conditions.push(buildOrderSearchConditions(params.search));
	}

	if (params.filters?.status?.length) {
		conditions.push({ status: { in: params.filters.status } });
	}

	if (conditions.length === 0) return {};
	if (conditions.length === 1) return conditions[0]!;
	return { AND: conditions };
}
