import { Resend } from "resend";
import { render } from "@react-email/components";
import { VerificationEmail } from "@/emails/verification-email";
import { PasswordResetEmail } from "@/emails/password-reset-email";
import { PasswordChangedEmail } from "@/emails/password-changed-email";
import { NewsletterEmail } from "@/emails/newsletter-email";
import { NewsletterConfirmationEmail } from "@/emails/newsletter-confirmation-email";
import { NewsletterWelcomeEmail } from "@/emails/newsletter-welcome-email";
import { OrderConfirmationEmail } from "@/emails/order-confirmation-email";
import { ShippingConfirmationEmail } from "@/emails/shipping-confirmation-email";
import { TrackingUpdateEmail } from "@/emails/tracking-update-email";
import { DeliveryConfirmationEmail } from "@/emails/delivery-confirmation-email";
import { AdminNewOrderEmail } from "@/emails/admin-new-order-email";
import { AdminRefundFailedEmail } from "@/emails/admin-refund-failed-email";
import { CustomizationRequestEmail } from "@/emails/customization-request-email";
import { EMAIL_FROM, EMAIL_SUBJECTS, EMAIL_ADMIN } from "@/shared/lib/email-config";

// Initialiser le client Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Envoie un email de vérification d'adresse email
 */
export async function sendVerificationEmail({
	to,
	url,
}: {
	to: string;
	url: string;
	token: string;
}) {
	try {
		const emailHtml = await render(VerificationEmail({ verificationUrl: url }));

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: EMAIL_SUBJECTS.VERIFICATION,
			html: emailHtml,
		});

		if (error) {
			return { success: false, error };
		}

		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
}

/**
 * Envoie un email de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail({
	to,
	url,
}: {
	to: string;
	url: string;
	token: string;
}) {
	try {
		const emailHtml = await render(PasswordResetEmail({ resetUrl: url }));

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: EMAIL_SUBJECTS.PASSWORD_RESET,
			html: emailHtml,
		});

		if (error) {
			return { success: false, error };
		}

		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
}

/**
 * Envoie un email de notification après changement de mot de passe
 */
export async function sendPasswordChangedEmail({
	to,
	userName,
	changeDate,
	ipAddress,
}: {
	to: string;
	userName: string;
	changeDate: string;
	ipAddress?: string;
}) {
	try {
		const resetUrl = `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000"}/mot-de-passe-oublie`;
		const emailHtml = await render(
			PasswordChangedEmail({
				userName,
				changeDate,
				ipAddress,
				resetUrl,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: EMAIL_SUBJECTS.PASSWORD_CHANGED,
			html: emailHtml,
		});

		if (error) {
			return { success: false, error };
		}

		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
}

/**
 * Envoie un email de newsletter à un abonné
 */
export async function sendNewsletterEmail({
	to,
	subject,
	content,
	unsubscribeUrl,
}: {
	to: string;
	subject: string;
	content: string;
	unsubscribeUrl: string;
}) {
	try {
		const emailHtml = await render(
			NewsletterEmail({
				subject,
				content,
				unsubscribeUrl,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: subject || EMAIL_SUBJECTS.NEWSLETTER,
			html: emailHtml,
		});

		if (error) {
			return { success: false, error };
		}

		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
}

/**
 * Envoie un email de confirmation d'inscription à la newsletter
 */
export async function sendNewsletterConfirmationEmail({
	to,
	confirmationUrl,
}: {
	to: string;
	confirmationUrl: string;
}) {
	try {
		const emailHtml = await render(
			NewsletterConfirmationEmail({ confirmationUrl })
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: EMAIL_SUBJECTS.NEWSLETTER_CONFIRMATION,
			html: emailHtml,
		});

		if (error) {
			return { success: false, error };
		}

		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
}

/**
 * Envoie un email de bienvenue après confirmation d'inscription à la newsletter
 */
export async function sendNewsletterWelcomeEmail({
	to,
}: {
	to: string;
}) {
	try {
		const emailHtml = await render(
			NewsletterWelcomeEmail({ email: to })
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: EMAIL_SUBJECTS.NEWSLETTER_WELCOME,
			html: emailHtml,
		});

		if (error) {
			return { success: false, error };
		}

		return { success: true, data };
	} catch (error) {
		return { success: false, error };
	}
}

/**
 * Envoie un email de confirmation de commande au client
 */
export async function sendOrderConfirmationEmail({
	to,
	orderNumber,
	customerName,
	items,
	subtotal,
	discount,
	shipping,
	tax,
	total,
	shippingAddress,
	trackingUrl,
	orderId,
	invoiceGenerated,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	items: Array<{
		productTitle: string;
		skuColor: string | null;
		skuMaterial: string | null;
		skuSize: string | null;
		quantity: number;
		price: number;
	}>;
	subtotal: number;
	discount: number;
	shipping: number;
	tax: number;
	total: number;
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string | null;
		postalCode: string;
		city: string;
		country: string;
	};
	trackingUrl: string;
	orderId: string;
	invoiceGenerated: boolean;
}) {
	try {
		const emailHtml = await render(
			OrderConfirmationEmail({
				orderNumber,
				customerName,
				items,
				subtotal,
				discount,
				shipping,
				tax,
				total,
				shippingAddress,
				trackingUrl,
				orderId,
				invoiceGenerated,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: EMAIL_SUBJECTS.ORDER_CONFIRMATION,
			html: emailHtml,
		});

		if (error) {
// console.error("[EMAIL] Error sending order confirmation:", error);
			return { success: false, error };
		}

// console.log(`✅ [EMAIL] Order confirmation sent to ${to} for order ${orderNumber}`);
		return { success: true, data };
	} catch (error) {
// console.error("[EMAIL] Exception sending order confirmation:", error);
		return { success: false, error };
	}
}

/**
 * Envoie un email de confirmation d'expédition au client
 */
export async function sendShippingConfirmationEmail({
	to,
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	shippingAddress,
	estimatedDelivery,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	trackingNumber: string;
	trackingUrl: string | null;
	carrierLabel: string;
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string | null;
		postalCode: string;
		city: string;
		country: string;
	};
	estimatedDelivery?: string;
}) {
	try {
		const emailHtml = await render(
			ShippingConfirmationEmail({
				orderNumber,
				customerName,
				trackingNumber,
				trackingUrl,
				carrierLabel,
				shippingAddress,
				estimatedDelivery,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: EMAIL_SUBJECTS.ORDER_SHIPPED,
			html: emailHtml,
		});

		if (error) {
			console.error("[EMAIL] Error sending shipping confirmation:", error);
			return { success: false, error };
		}

		console.log(`✅ [EMAIL] Shipping confirmation sent to ${to} for order ${orderNumber}`);
		return { success: true, data };
	} catch (error) {
		console.error("[EMAIL] Exception sending shipping confirmation:", error);
		return { success: false, error };
	}
}

/**
 * Envoie un email de mise à jour du suivi de commande au client
 */
export async function sendTrackingUpdateEmail({
	to,
	orderNumber,
	customerName,
	trackingNumber,
	trackingUrl,
	carrierLabel,
	shippingAddress,
	estimatedDelivery,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	trackingNumber: string;
	trackingUrl: string | null;
	carrierLabel: string;
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string | null;
		postalCode: string;
		city: string;
		country: string;
	};
	estimatedDelivery?: string;
}) {
	try {
		const emailHtml = await render(
			TrackingUpdateEmail({
				orderNumber,
				customerName,
				trackingNumber,
				trackingUrl,
				carrierLabel,
				shippingAddress,
				estimatedDelivery,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: EMAIL_SUBJECTS.ORDER_TRACKING_UPDATE,
			html: emailHtml,
		});

		if (error) {
			console.error("[EMAIL] Error sending tracking update:", error);
			return { success: false, error };
		}

		console.log(`✅ [EMAIL] Tracking update sent to ${to} for order ${orderNumber}`);
		return { success: true, data };
	} catch (error) {
		console.error("[EMAIL] Exception sending tracking update:", error);
		return { success: false, error };
	}
}

/**
 * Envoie un email de confirmation de livraison au client
 */
export async function sendDeliveryConfirmationEmail({
	to,
	orderNumber,
	customerName,
	deliveryDate,
	orderDetailsUrl,
}: {
	to: string;
	orderNumber: string;
	customerName: string;
	deliveryDate: string;
	orderDetailsUrl: string;
}) {
	try {
		const emailHtml = await render(
			DeliveryConfirmationEmail({
				orderNumber,
				customerName,
				deliveryDate,
				orderDetailsUrl,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to,
			subject: EMAIL_SUBJECTS.ORDER_DELIVERED,
			html: emailHtml,
		});

		if (error) {
			console.error("[EMAIL] Error sending delivery confirmation:", error);
			return { success: false, error };
		}

		console.log(`✅ [EMAIL] Delivery confirmation sent to ${to} for order ${orderNumber}`);
		return { success: true, data };
	} catch (error) {
		console.error("[EMAIL] Exception sending delivery confirmation:", error);
		return { success: false, error };
	}
}

/**
 * Envoie un email de notification admin pour une nouvelle commande
 */
export async function sendAdminNewOrderEmail({
	orderNumber,
	orderId,
	customerName,
	customerEmail,
	items,
	subtotal,
	discount,
	shipping,
	tax,
	total,
	shippingAddress,
	dashboardUrl,
	stripePaymentIntentId,
}: {
	orderNumber: string;
	orderId: string;
	customerName: string;
	customerEmail: string;
	items: Array<{
		productTitle: string;
		skuColor: string | null;
		skuMaterial: string | null;
		skuSize: string | null;
		quantity: number;
		price: number;
	}>;
	subtotal: number;
	discount: number;
	shipping: number;
	tax: number;
	total: number;
	shippingAddress: {
		firstName: string;
		lastName: string;
		address1: string;
		address2?: string | null;
		postalCode: string;
		city: string;
		country: string;
		phone: string;
	};
	dashboardUrl: string;
	stripePaymentIntentId?: string;
}) {
	try {
		const emailHtml = await render(
			AdminNewOrderEmail({
				orderNumber,
				orderId,
				customerName,
				customerEmail,
				items,
				subtotal,
				discount,
				shipping,
				tax,
				total,
				shippingAddress,
				dashboardUrl,
				stripePaymentIntentId,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: EMAIL_ADMIN,
			subject: `🎉 Nouvelle commande ${orderNumber} - ${(total / 100).toFixed(2)}€`,
			html: emailHtml,
		});

		if (error) {
// console.error("[EMAIL] Error sending admin notification:", error);
			return { success: false, error };
		}

// console.log(`✅ [EMAIL] Admin notification sent for order ${orderNumber}`);
		return { success: true, data };
	} catch (error) {
// console.error("[EMAIL] Exception sending admin notification:", error);
		return { success: false, error };
	}
}

/**
 * Envoie une alerte admin en cas d'échec de remboursement automatique
 */
export async function sendAdminRefundFailedAlert({
	orderNumber,
	orderId,
	customerEmail,
	amount,
	reason,
	errorMessage,
	stripePaymentIntentId,
	dashboardUrl,
}: {
	orderNumber: string;
	orderId: string;
	customerEmail: string;
	amount: number;
	reason: "payment_failed" | "payment_canceled" | "other";
	errorMessage: string;
	stripePaymentIntentId: string;
	dashboardUrl: string;
}) {
	try {
		const stripeDashboardUrl = `https://dashboard.stripe.com/payments/${stripePaymentIntentId}`;

		const emailHtml = await render(
			AdminRefundFailedEmail({
				orderNumber,
				orderId,
				customerEmail,
				amount,
				reason,
				errorMessage,
				stripePaymentIntentId,
				dashboardUrl,
				stripeDashboardUrl,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: EMAIL_ADMIN,
			subject: `🚨 ACTION REQUISE : Échec remboursement ${orderNumber}`,
			html: emailHtml,
		});

		if (error) {
// console.error("[EMAIL] Error sending refund failed alert:", error);
			return { success: false, error };
		}

// console.log(`🚨 [EMAIL] Refund failed alert sent for order ${orderNumber}`);
		return { success: true, data };
	} catch (error) {
// console.error("[EMAIL] Exception sending refund failed alert:", error);
		return { success: false, error };
	}
}

/**
 * Envoie une notification admin pour une nouvelle demande de personnalisation
 */
export async function sendCustomizationRequestEmail({
	firstName,
	lastName,
	email,
	phone,
	jewelryType,
	customizationDetails,
	newsletter,
}: {
	firstName: string;
	lastName: string;
	email: string;
	phone?: string;
	jewelryType: string;
	customizationDetails: string;
	newsletter: boolean;
}) {
	try {
		const emailHtml = await render(
			CustomizationRequestEmail({
				firstName,
				lastName,
				email,
				phone,
				jewelryType,
				customizationDetails,
				newsletter,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: EMAIL_ADMIN,
			replyTo: email,
			subject: `${EMAIL_SUBJECTS.CUSTOMIZATION_REQUEST} - ${firstName} ${lastName}`,
			html: emailHtml,
		});

		if (error) {
// console.error("[EMAIL] Error sending customization request:", error);
			return { success: false, error };
		}

// console.log(`✅ [EMAIL] Customization request sent from ${email}`);
		return { success: true, data };
	} catch (error) {
// console.error("[EMAIL] Exception sending customization request:", error);
		return { success: false, error };
	}
}

/**
 * 🔴 ALERTE ADMIN : Échec génération facture (Conformité légale)
 *
 * Envoie une alerte admin critique lorsque la génération automatique
 * d'une facture Stripe échoue après un paiement réussi.
 *
 * IMPORTANT : Obligation légale B2B France - Le client DOIT recevoir
 * sa facture sous 48h maximum.
 *
 */
export async function sendAdminInvoiceFailedAlert({
	orderNumber,
	orderId,
	customerEmail,
	customerCompanyName,
	customerSiret,
	amount,
	errorMessage,
	stripePaymentIntentId,
	dashboardUrl,
}: {
	orderNumber: string;
	orderId: string;
	customerEmail: string;
	customerCompanyName?: string;
	customerSiret?: string;
	amount: number;
	errorMessage: string;
	stripePaymentIntentId?: string;
	dashboardUrl: string;
}) {
	// Temporairement désactivé en attendant la création du template email
// console.error(`🚨 [EMAIL] Invoice failed for order ${orderNumber}:`, errorMessage);
// console.error(`Order ID: ${orderId}, Customer: ${customerEmail}, Amount: ${amount}`);

	/* TODO: Activer quand le template sera créé
	try {
		const emailHtml = await render(
				orderNumber,
				orderId,
				customerEmail,
				customerCompanyName,
				customerSiret,
				amount,
				errorMessage,
				stripePaymentIntentId,
				dashboardUrl,
			})
		);

		const { data, error } = await resend.emails.send({
			from: EMAIL_FROM,
			to: EMAIL_ADMIN,
			subject: `🚨 ACTION REQUISE : Échec facture ${orderNumber}${customerCompanyName ? ` - ${customerCompanyName}` : ''}`,
			html: emailHtml,
		});

		if (error) {
// console.error("[EMAIL] Error sending invoice failed alert:", error);
			return { success: false, error };
		}

// console.log(`🚨 [EMAIL] Invoice failed alert sent for order ${orderNumber}`);
		return { success: true, data };
	} catch (error) {
// console.error("[EMAIL] Exception sending invoice failed alert:", error);
		return { success: false, error };
	}
	*/
}
