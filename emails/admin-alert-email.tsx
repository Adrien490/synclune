import { Button, Section, Text } from "react-email";
import { EMAIL_CLASSES, EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";

export type AdminAlertType =
	| "cron"
	| "dispute"
	| "invoice"
	| "order-processing"
	| "refund"
	| "stuck-orders"
	| "webhook";

interface AdminAlertEmailProps {
	type: AdminAlertType;
	context: string;
	summary: string;
	stackTrace?: string;
	ctaUrl: string;
	ctaLabel?: string;
	stripeCtaUrl?: string;
	stripeCtaLabel?: string;
}

const HEADER_TEXT: Record<AdminAlertType, string> = {
	cron: "Échec cron job",
	dispute: "Litige Stripe",
	invoice: "Échec génération facture",
	"order-processing": "Échec traitement commande",
	refund: "Échec du remboursement",
	"stuck-orders": "Commandes en attente prolongée",
	webhook: "Webhook Stripe en échec",
};

const PREVIEW_TEXT: Record<AdminAlertType, string> = {
	cron: "Échec cron job — vérifier les logs",
	dispute: "Litige Stripe — action requise",
	invoice: "Échec génération facture — conformité légale",
	"order-processing": "Paiement reçu — échec traitement commande",
	refund: "Échec remboursement — action manuelle",
	"stuck-orders": "Commandes en attente — vérifier l'avancement",
	webhook: "Webhook Stripe en échec",
};

const URGENCY_LABEL: Record<AdminAlertType, string> = {
	cron: "Action manuelle peut-être requise",
	dispute: "Action requise",
	invoice: "Conformité légale — Action requise",
	"order-processing": "URGENT — Paiement reçu, commande non traitée",
	refund: "Action manuelle requise",
	"stuck-orders": "Vérification recommandée",
	webhook: "Action manuelle peut-être requise",
};

export const AdminAlertEmail = ({
	type,
	context,
	summary,
	stackTrace,
	ctaUrl,
	ctaLabel = "Voir le dashboard admin",
	stripeCtaUrl,
	stripeCtaLabel = "Ouvrir dans Stripe",
}: AdminAlertEmailProps) => {
	const urgencyColor =
		type === "order-processing" ? EMAIL_COLORS.error : EMAIL_COLORS.text.secondary;

	return (
		<EmailLayout preview={PREVIEW_TEXT[type]} headerText={HEADER_TEXT[type]}>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text
					className={EMAIL_CLASSES.text.secondary}
					style={{
						...EMAIL_STYLES.text.small,
						color: urgencyColor,
						fontWeight: type === "order-processing" ? "bold" : "normal",
					}}
				>
					{URGENCY_LABEL[type]}
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{
						margin: 0,
						fontFamily: "monospace",
						fontSize: "13px",
						lineHeight: "1.6",
						color: EMAIL_COLORS.text.primary,
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
					}}
				>
					{context}
				</Text>
			</EmailCard>

			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
					Résumé
				</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, fontSize: "15px" }}
				>
					{summary}
				</Text>
			</Section>

			{stackTrace && (
				<Section style={{ marginBottom: "24px" }}>
					<EmailHeading level="h3" style={{ marginBottom: "8px" }}>
						Détails techniques
					</EmailHeading>
					<ErrorCodeBlock error={stackTrace} />
				</Section>
			)}

			{stripeCtaUrl && (
				<Section style={{ marginBottom: "12px", textAlign: "center" }}>
					<Button
						href={stripeCtaUrl}
						className={EMAIL_CLASSES.button.primary}
						style={{
							...EMAIL_STYLES.button.primary,
							backgroundColor: EMAIL_COLORS.stripe,
						}}
					>
						{stripeCtaLabel}
					</Button>
				</Section>
			)}

			<EmailCTA href={ctaUrl}>{ctaLabel}</EmailCTA>
		</EmailLayout>
	);
};

AdminAlertEmail.PreviewProps = {
	type: "order-processing",
	context:
		"Commande   : CMD-1730000000-ABCD\nClient     : marie.dupont@example.com\nTotal      : 183,90 €\nPayment ID : pi_1234567890abcdefghij",
	summary:
		"Le paiement a été reçu sur Stripe mais le traitement de la commande a échoué. Une intervention manuelle est requise pour créer la commande en base ou rembourser le client.",
	stackTrace:
		"Error: processOrderFromPaymentIntent failed\n  at processOrder (modules/webhooks/handlers/checkout-handlers.ts:142)\n  at async handleCheckoutCompleted",
	ctaUrl: "https://synclune.fr/admin",
	ctaLabel: "Voir le dashboard admin",
	stripeCtaUrl: "https://dashboard.stripe.com/payments/pi_1234567890abcdefghij",
	stripeCtaLabel: "Ouvrir dans Stripe",
} as AdminAlertEmailProps;

export default AdminAlertEmail;
