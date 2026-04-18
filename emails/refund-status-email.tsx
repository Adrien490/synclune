import { formatEuro } from "@/shared/utils/format-euro";
import { Section, Text } from "@react-email/components";
import {
	EMAIL_CLASSES,
	EMAIL_COLORS,
	EMAIL_STYLES,
	REFUND_DELAY_TEXT,
	REFUND_REASON_LABELS,
} from "./email-colors";
import { EmailCard } from "./_components/email-card";
import { EmailCTA } from "./_components/email-cta";
import { EmailHeading } from "./_components/email-heading";
import { EmailLayout } from "./_components/email-layout";
import { EmailSummaryRow } from "./_components/email-summary-row";

export type RefundStatus = "approved" | "confirmed";

interface RefundStatusEmailProps {
	status: RefundStatus;
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	originalOrderTotal: number;
	reason: string;
	isPartialRefund: boolean;
	orderDetailsUrl: string;
}

const COPY: Record<
	RefundStatus,
	{ preview: string; title: string; body: (amount: string) => string; amountLabel: string }
> = {
	approved: {
		preview: "accepté",
		title: "Remboursement accepté",
		body: (amount) =>
			`votre demande de remboursement de ${amount} a été acceptée. Le traitement sera effectué sous ${REFUND_DELAY_TEXT}.`,
		amountLabel: "Montant",
	},
	confirmed: {
		preview: "effectué",
		title: "Remboursement effectué",
		body: (amount) =>
			`votre remboursement de ${amount} a été effectué. Le montant sera crédité sous ${REFUND_DELAY_TEXT}.`,
		amountLabel: "Montant remboursé",
	},
};

/**
 * Template unifié pour les 2 états de remboursement :
 * - `approved` : la demande vient d'être approuvée (traitement à venir)
 * - `confirmed` : le remboursement a été exécuté par Stripe (crédit en cours)
 *
 * Fusion de `refund-approved-email` et `refund-confirmation-email` — structure
 * identique, seuls preview/titre/intro/label diffèrent selon le status.
 */
export const RefundStatusEmail = ({
	status,
	orderNumber,
	customerName,
	refundAmount,
	originalOrderTotal,
	reason,
	isPartialRefund,
	orderDetailsUrl,
}: RefundStatusEmailProps) => {
	const copy = COPY[status];
	const reasonLabel = REFUND_REASON_LABELS[reason] ?? reason;
	const formattedAmount = formatEuro(refundAmount);

	return (
		<EmailLayout preview={`Remboursement ${formattedAmount} ${copy.preview}`}>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<EmailHeading level="h1">{copy.title}</EmailHeading>
				<Text
					className={EMAIL_CLASSES.text.body}
					style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}
				>
					Bonjour {customerName}, {copy.body(formattedAmount)}
				</Text>
			</Section>

			{/* Détails */}
			<EmailCard style={{ marginBottom: "24px" }}>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label="Commande"
					value={orderNumber}
					variant="mono"
				/>
				<EmailSummaryRow
					style={{ marginBottom: "8px" }}
					label={copy.amountLabel}
					value={formattedAmount}
					variant="highlight"
				/>
				{isPartialRefund && (
					<EmailSummaryRow
						style={{ marginBottom: "8px" }}
						label="Montant initial"
						value={
							<Text
								className={EMAIL_CLASSES.text.body}
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{formatEuro(originalOrderTotal)}
							</Text>
						}
					/>
				)}
				<EmailSummaryRow label="Raison" value={reasonLabel} />
			</EmailCard>

			<EmailCTA href={orderDetailsUrl}>Voir ma commande</EmailCTA>
		</EmailLayout>
	);
};

RefundStatusEmail.PreviewProps = {
	status: "approved",
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	refundAmount: 8990,
	originalOrderTotal: 8990,
	reason: "CUSTOMER_REQUEST",
	isPartialRefund: false,
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RefundStatusEmailProps;

export default RefundStatusEmail;
