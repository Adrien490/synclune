import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES, REFUND_DELAY_TEXT, REFUND_REASON_LABELS } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

interface RefundApprovedEmailProps {
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	originalOrderTotal: number;
	reason: string;
	isPartialRefund: boolean;
	orderDetailsUrl: string;
}

export const RefundApprovedEmail = ({
	orderNumber,
	customerName,
	refundAmount,
	originalOrderTotal,
	reason,
	isPartialRefund,
	orderDetailsUrl,
}: RefundApprovedEmailProps) => {
	const reasonLabel = REFUND_REASON_LABELS[reason] || reason;

	return (
		<EmailLayout preview={`Remboursement ${formatEuro(refundAmount)} accepté`}>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Remboursement accepté</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, votre demande de remboursement de{" "}
					{formatEuro(refundAmount)} a été acceptée. Le traitement sera
					effectué sous {REFUND_DELAY_TEXT}.
				</Text>
			</Section>

			{/* Détails */}
			<Section style={{ marginBottom: "24px" }}>
				<div style={EMAIL_STYLES.section.card}>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Commande</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "600",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{orderNumber}
							</Text>
						}
					/>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Montant</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.primary,
								}}
							>
								{formatEuro(refundAmount)}
							</Text>
						}
					/>
					{isPartialRefund && (
						<FlexRow
							style={{ marginBottom: "8px" }}
							left={<Text style={EMAIL_STYLES.text.small}>Montant initial</Text>}
							right={
								<Text
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
					<FlexRow
						left={<Text style={EMAIL_STYLES.text.small}>Raison</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{reasonLabel}
							</Text>
						}
					/>
				</div>
			</Section>

			{/* CTA */}
			<Section style={{ marginBottom: "32px", textAlign: "center" }}>
				<Button href={orderDetailsUrl} style={EMAIL_STYLES.button.primary}>
					Voir ma commande
				</Button>
			</Section>
		</EmailLayout>
	);
};

RefundApprovedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	refundAmount: 8990,
	originalOrderTotal: 8990,
	reason: "CUSTOMER_REQUEST",
	isPartialRefund: false,
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RefundApprovedEmailProps;

export default RefundApprovedEmail;
