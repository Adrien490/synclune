import { formatEuro } from "@/shared/utils/format-euro";
import { Section, Text } from "react-email";
import {
	EMAIL_CLASSES,
	EMAIL_STYLES,
	REFUND_DELAY_TEXT,
	REFUND_REASON_LABELS,
} from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { EmailSummaryRow } from "./_components/email-summary-row";

interface RefundConfirmedEmailProps {
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	reason: string;
	orderDetailsUrl: string;
	/**
	 * Numéro d'avoir (format `A-YYYY-NNNNN`) émis automatiquement lors du
	 * remboursement total (Art. 272-I CGI). Absent pour les remboursements
	 * partiels ou les commandes sans facture émise.
	 */
	creditNoteNumber?: string | null;
	/**
	 * Numéro de la facture initiale annulée par l'avoir. Affiché pour permettre
	 * au client de retracer le lien comptable.
	 */
	invoiceNumber?: string | null;
}

/**
 * Email envoyé au client lorsque le remboursement a été exécuté par Stripe
 * (remboursement total uniquement — audit 2026).
 */
export const RefundConfirmedEmail = ({
	orderNumber,
	customerName,
	refundAmount,
	reason,
	orderDetailsUrl,
	creditNoteNumber,
	invoiceNumber,
}: RefundConfirmedEmailProps) => {
	const reasonLabel = REFUND_REASON_LABELS[reason] ?? reason;
	const formattedAmount = formatEuro(refundAmount);

	return (
		<EmailLayout preview={`Remboursement ${formattedAmount} effectué`}>
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">Remboursement effectué</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, votre remboursement de {formattedAmount} a été effectué. Le
					montant sera crédité sous {REFUND_DELAY_TEXT}.
				</Text>
			</Section>

			<EmailCard style={{ marginBottom: "24px" }}>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Commande"
					value={orderNumber}
					variant="mono"
				/>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Montant remboursé"
					value={formattedAmount}
					variant="highlight"
				/>
				<EmailSummaryRow label="Raison" value={reasonLabel} />
				{creditNoteNumber && (
					<EmailSummaryRow
						style={{ marginTop: "8px" }}
						label="Avoir"
						value={creditNoteNumber}
						variant="mono"
					/>
				)}
				{invoiceNumber && (
					<EmailSummaryRow
						style={{ marginTop: "8px" }}
						label="Facture annulée"
						value={invoiceNumber}
						variant="mono"
					/>
				)}
			</EmailCard>

			{creditNoteNumber && (
				<Section style={{ marginBottom: "16px" }}>
					<Text className={EMAIL_CLASSES.text.secondary} style={{ ...EMAIL_STYLES.text.small }}>
						Conformément à l'article 272-I du Code général des impôts, un avoir {creditNoteNumber} a
						été émis en annulation de la facture {invoiceNumber ?? "initiale"}. Le document est
						consultable depuis votre espace commande.
					</Text>
				</Section>
			)}

			<EmailCTA href={orderDetailsUrl}>Voir ma commande</EmailCTA>
		</EmailLayout>
	);
};

RefundConfirmedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	refundAmount: 8990,
	reason: "CUSTOMER_REQUEST",
	orderDetailsUrl:
		"https://synclune.fr/suivi-commande?commande=CMD-2024-ABCD1234&token=abc123def456abc123def456abc12345",
	creditNoteNumber: "A-2026-00012",
	invoiceNumber: "F-2026-00084",
} as RefundConfirmedEmailProps;

export default RefundConfirmedEmail;
