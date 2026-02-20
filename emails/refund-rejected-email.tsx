import { formatEuro } from "@/shared/utils/format-euro";
import { Button, Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES, REFUND_REASON_LABELS } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { FlexRow } from "./_components/flex-row";

interface RefundRejectedEmailProps {
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	reason?: string;
	orderDetailsUrl: string;
}

export const RefundRejectedEmail = ({
	orderNumber,
	customerName,
	refundAmount,
	reason,
	orderDetailsUrl,
}: RefundRejectedEmailProps) => {
	const reasonLabel = reason
		? REFUND_REASON_LABELS[reason] || reason
		: null;

	return (
		<EmailLayout preview={`Demande de remboursement de ${formatEuro(refundAmount)} refusée`}>
			{/* Titre */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.heading.h2}>Demande de remboursement refusée</Text>
				<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
					Bonjour {customerName}, nous avons examiné votre demande de
					remboursement de {formatEuro(refundAmount)} pour la commande{" "}
					<strong>{orderNumber}</strong> et celle-ci n'a malheureusement
					pas pu être acceptée.
				</Text>
			</Section>

			{/* Raison du refus */}
			{reasonLabel && (
				<Section style={{ marginBottom: "24px" }}>
					<Section style={EMAIL_STYLES.section.card}>
						<Text style={{ ...EMAIL_STYLES.text.small, marginBottom: "4px" }}>
							Motif
						</Text>
						<Text
							style={{
								margin: 0,
								fontSize: "14px",
								color: EMAIL_COLORS.text.primary,
							}}
						>
							{reasonLabel}
						</Text>
					</Section>
				</Section>
			)}

			{/* Info contact */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={EMAIL_STYLES.text.body}>
					Si vous avez des questions ou souhaitez contester cette décision,
					n'hésitez pas à nous contacter. Notre équipe est à votre disposition
					pour vous accompagner.
				</Text>
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

RefundRejectedEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	refundAmount: 8990,
	reason: "CUSTOMER_REQUEST",
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RefundRejectedEmailProps;

export default RefundRejectedEmail;
