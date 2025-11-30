"use server";

import { prisma } from "@/shared/lib/prisma";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { ADDRESS_ERROR_MESSAGES } from "@/modules/users/constants/address";

export async function deleteAddress(
	_prev: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	const addressId = formData.get("addressId") as string;

	if (!addressId) {
		return {
			status: ActionStatus.ERROR,
			message: "ID d'adresse manquant",
		};
	}
	try {
		const user = await getCurrentUser();

		if (!user) {
			return {
				status: ActionStatus.ERROR,
				message: ADDRESS_ERROR_MESSAGES.NOT_AUTHENTICATED,
			};
		}

		const existingAddress = await prisma.address.findFirst({
			where: { id: addressId, userId: user.id },
			select: { id: true, isDefault: true },
		});

		if (!existingAddress) {
			return {
				status: ActionStatus.ERROR,
				message: ADDRESS_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		// Utiliser une transaction pour garantir l'intégrité
		await prisma.$transaction(async (tx) => {
			// Si adresse par défaut, assigner le défaut à une autre adresse si elle existe
			if (existingAddress.isDefault) {
				const otherAddress = await tx.address.findFirst({
					where: { userId: user.id, id: { not: addressId } },
					orderBy: { createdAt: "desc" },
				});

				// Si une autre adresse existe, la définir comme nouvelle adresse par défaut
				if (otherAddress) {
					await tx.address.update({
						where: { id: otherAddress.id },
						data: { isDefault: true },
					});
				}
				// Sinon, l'utilisateur n'aura plus d'adresse par défaut (acceptable)
			}

			await tx.address.delete({
				where: { id: addressId },
			});
		});

		// Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Adresse supprimée avec succès",
		};
	} catch (error) {
// console.error("Error deleting address:", error);
		return {
			status: ActionStatus.ERROR,
			message:
				error instanceof Error ? error.message : ADDRESS_ERROR_MESSAGES.DELETE_FAILED,
		};
	}
}
