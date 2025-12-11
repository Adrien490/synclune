import { formatEuro } from "@/shared/utils/format-euro";
import {
	Body,
	Button,
	Container,
	Head,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";

interface RefundConfirmationEmailProps {
	orderNumber: string;
	customerName: string;
	refundAmount: number;
	originalOrderTotal: number;
	reason: string;
	isPartialRefund: boolean;
	orderDetailsUrl: string;
}

const reasonLabels: Record<string, string> = {
	CUSTOMER_REQUEST: "Demande client",
	DEFECTIVE: "Produit défectueux",
	WRONG_ITEM: "Erreur de commande",
	LOST_IN_TRANSIT: "Colis perdu",
	FRAUD: "Transaction contestée",
	OTHER: "Autre raison",
};

export const RefundConfirmationEmail = ({
	orderNumber,
	customerName,
	refundAmount,
	originalOrderTotal,
	reason,
	isPartialRefund,
	orderDetailsUrl,
}: RefundConfirmationEmailProps) => {
	const reasonLabel = reasonLabels[reason] || reason;

	return (
		<Html>
			<Head />
			<Preview>Remboursement {formatEuro(refundAmount)} effectué</Preview>
			<Body style={{ backgroundColor: EMAIL_COLORS.background.main }}>
				<Container style={EMAIL_STYLES.container}>
					{/* Header */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Text
							style={{
								margin: 0,
								fontSize: "24px",
								fontWeight: "bold",
								color: EMAIL_COLORS.primary,
							}}
						>
							Synclune
						</Text>
					</Section>

					{/* Titre */}
					<Section style={{ marginBottom: "24px" }}>
						<Text style={EMAIL_STYLES.heading.h2}>Remboursement effectué</Text>
						<Text style={{ ...EMAIL_STYLES.text.body, marginTop: "12px" }}>
							Bonjour {customerName}, ton remboursement de{" "}
							{formatEuro(refundAmount)} a été effectué. Le montant sera crédité
							sous 3 à 10 jours ouvrés.
						</Text>
					</Section>

					{/* Détails */}
					<Section style={{ marginBottom: "24px" }}>
						<div style={EMAIL_STYLES.section.card}>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Commande</Text>
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
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									marginBottom: "8px",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Montant remboursé</Text>
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
							</div>
							{isPartialRefund && (
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										marginBottom: "8px",
									}}
								>
									<Text style={EMAIL_STYLES.text.small}>Montant initial</Text>
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
								</div>
							)}
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
								}}
							>
								<Text style={EMAIL_STYLES.text.small}>Raison</Text>
								<Text
									style={{
										margin: 0,
										fontSize: "14px",
										color: EMAIL_COLORS.text.primary,
									}}
								>
									{reasonLabel}
								</Text>
							</div>
						</div>
					</Section>

					{/* CTA */}
					<Section style={{ marginBottom: "32px", textAlign: "center" }}>
						<Button href={orderDetailsUrl} style={EMAIL_STYLES.button.primary}>
							Voir ma commande
						</Button>
					</Section>

					{/* Footer */}
					<Section
						style={{
							paddingTop: "24px",
							borderTop: `1px solid ${EMAIL_COLORS.border}`,
							textAlign: "center",
						}}
					>
						<Text style={EMAIL_STYLES.text.tiny}>
							© {new Date().getFullYear()} Synclune
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
};

RefundConfirmationEmail.PreviewProps = {
	orderNumber: "CMD-2024-ABCD1234",
	customerName: "Marie",
	refundAmount: 8990,
	originalOrderTotal: 8990,
	reason: "CUSTOMER_REQUEST",
	isPartialRefund: false,
	orderDetailsUrl: "https://synclune.fr/compte/commandes/CMD-2024-ABCD1234",
} as RefundConfirmationEmailProps;

export default RefundConfirmationEmail;
