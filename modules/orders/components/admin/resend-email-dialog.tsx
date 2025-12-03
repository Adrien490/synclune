"use client";

import { useState } from "react";
import {
	OrderStatus,
	FulfillmentStatus,
} from "@/app/generated/prisma/browser";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useResendOrderEmail } from "@/modules/orders/hooks/use-resend-order-email";
import type { ResendEmailType } from "@/modules/orders/actions/resend-order-email";
import { Loader2, Mail, Truck, PackageCheck } from "lucide-react";

export const RESEND_EMAIL_DIALOG_ID = "resend-email";

interface ResendEmailData {
	orderId: string;
	orderNumber: string;
	orderStatus: OrderStatus;
	fulfillmentStatus: FulfillmentStatus;
	[key: string]: unknown;
}

const EMAIL_OPTIONS: {
	value: ResendEmailType;
	label: string;
	description: string;
	icon: typeof Mail;
}[] = [
	{
		value: "confirmation",
		label: "Confirmation de commande",
		description: "Email envoyé lors de la création de la commande",
		icon: Mail,
	},
	{
		value: "shipping",
		label: "Confirmation d'expédition",
		description: "Email avec le numéro de suivi et le transporteur",
		icon: Truck,
	},
	{
		value: "delivery",
		label: "Confirmation de livraison",
		description: "Email confirmant la réception du colis",
		icon: PackageCheck,
	},
];

export function ResendEmailDialog() {
	const dialog = useDialog<ResendEmailData>(RESEND_EMAIL_DIALOG_ID);
	const { resend, isPending } = useResendOrderEmail();
	const [selectedType, setSelectedType] = useState<ResendEmailType>("confirmation");

	const handleOpenChange = (open: boolean) => {
		if (!open && !isPending) {
			dialog.close();
			setSelectedType("confirmation");
		}
	};

	const handleSubmit = () => {
		if (!dialog.data?.orderId) return;

		resend(dialog.data.orderId, selectedType);
		dialog.close();
		setSelectedType("confirmation");
	};

	// Déterminer quels emails sont disponibles selon le statut
	const canSendShipping =
		dialog.data?.orderStatus === OrderStatus.SHIPPED ||
		dialog.data?.orderStatus === OrderStatus.DELIVERED;

	const canSendDelivery =
		dialog.data?.orderStatus === OrderStatus.DELIVERED ||
		dialog.data?.fulfillmentStatus === FulfillmentStatus.DELIVERED;

	const availableOptions = EMAIL_OPTIONS.filter((option) => {
		if (option.value === "confirmation") return true;
		if (option.value === "shipping") return canSendShipping;
		if (option.value === "delivery") return canSendDelivery;
		return false;
	});

	return (
		<ResponsiveDialog open={dialog.isOpen} onOpenChange={handleOpenChange}>
			<ResponsiveDialogContent className="sm:max-w-[425px]">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Renvoyer un email</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Choisissez le type d'email à renvoyer pour la commande{" "}
						<strong>{dialog.data?.orderNumber}</strong>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<div className="py-4">
					<RadioGroup
						value={selectedType}
						onValueChange={(value) => setSelectedType(value as ResendEmailType)}
						className="space-y-3"
					>
						{availableOptions.map((option) => {
							const Icon = option.icon;
							return (
								<div key={option.value} className="flex items-start space-x-3">
									<RadioGroupItem
										value={option.value}
										id={option.value}
										className="mt-1"
									/>
									<Label
										htmlFor={option.value}
										className="flex flex-col cursor-pointer"
									>
										<span className="flex items-center gap-2 font-medium">
											<Icon className="h-4 w-4" aria-hidden="true" />
											{option.label}
										</span>
										<span className="text-sm text-muted-foreground font-normal">
											{option.description}
										</span>
									</Label>
								</div>
							);
						})}
					</RadioGroup>

					{availableOptions.length < 3 && (
						<p className="mt-4 text-xs text-muted-foreground">
							Certains emails ne sont pas disponibles car la commande n'a pas
							encore atteint le statut requis.
						</p>
					)}
				</div>

				<ResponsiveDialogFooter>
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isPending}
					>
						Annuler
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
								Envoi...
							</>
						) : (
							<>
								<Mail className="mr-2 h-4 w-4" aria-hidden="true" />
								Envoyer
							</>
						)}
					</Button>
				</ResponsiveDialogFooter>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
