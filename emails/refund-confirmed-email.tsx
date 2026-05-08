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
			</EmailCard>

			<EmailCTA href={orderDetailsUrl}>Voir ma commande</EmailCTA>
		</EmailLayout>
	);
};

RefundConfirmedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	refundAmount: 8990,
	reason: "CUSTOMER_REQUEST",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RefundConfirmedEmailProps;

export default RefundConfirmedEmail;
