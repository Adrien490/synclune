"use server";

import { prisma } from "@/shared/lib/prisma";
import { requireAuth } from "@/modules/auth/lib/require-auth";
import { updateTag } from "next/cache";
import { getUserAddressesInvalidationTags } from "../constants/cache";
import type { ActionState } from "@/shared/types/server-action";
import { ActionStatus } from "@/shared/types/server-action";
import { ADDRESS_ERROR_MESSAGES } from "../constants/address.constants";
import { validateInput, handleActionError } from "@/shared/lib/actions";
import { addressIdSchema } from "../schemas/user-addresses.schemas";

export async function setDefaultAddress(
	_prev: ActionState | undefined,
	formData: FormData
): Promise<ActionState> {
	const validation = validateInput(addressIdSchema, {
		addressId: formData.get("addressId"),
	});

	if ("error" in validation) {
		return validation.error;
	}

	const { addressId } = validation.data;
	try {
		const auth = await requireAuth();
		if ("error" in auth) return auth.error;
		const { user } = auth;

		const existingAddress = await prisma.address.findFirst({
			where: { id: addressId, userId: user.id },
			select: { id: true },
		});

		if (!existingAddress) {
			return {
				status: ActionStatus.ERROR,
				message: ADDRESS_ERROR_MESSAGES.NOT_FOUND,
			};
		}

		await prisma.$transaction([
			prisma.address.updateMany({
				where: { userId: user.id },
				data: { isDefault: false },
			}),
			prisma.address.update({
				where: { id: addressId },
				data: { isDefault: true },
			}),
		]);

		// Revalidation du cache avec tags
		getUserAddressesInvalidationTags(user.id).forEach(tag => updateTag(tag));

		return {
			status: ActionStatus.SUCCESS,
			message: "Adresse par défaut modifiée",
		};
	} catch (e) {
		return handleActionError(e, "Erreur lors du changement d'adresse par défaut");
	}
}
