-- Purge RGPD one-shot (audit rétention PII 10 ans, 2026-07-09).
--
-- Les audits ADDRESS_UPDATED historiques stockaient les valeurs COMPLÈTES
-- d'adresse client (previousAddress/newAddress : nom, adresse, téléphone) dans
-- OrderHistory.metadata. OrderHistory est immuable 10 ans (Art. L123-22) et
-- n'est scrubé ni à l'anonymisation compte ni à la purge 10 ans → cette PII
-- survivait sans limite de durée (violation RGPD Art. 5.1.e).
--
-- Le code n'écrit désormais que la liste des champs modifiés (`changedFields`,
-- cf. update-order-shipping-address.ts / update-order-billing-address.ts) ;
-- cette migration aligne le stock existant sur le nouveau contrat.
--
-- Exception assumée à l'invariant 3 (immutabilité OrderHistory) : purge RGPD
-- ciblée ≠ falsification comptable — les faits d'audit (qui, quand, quelle
-- action, quels champs) sont intégralement conservés, seules les VALEURS de
-- PII client sont retirées.
UPDATE "OrderHistory"
SET "metadata" = jsonb_strip_nulls(
	jsonb_build_object(
		'addressType', "metadata" -> 'addressType',
		'previousSameAsShipping', "metadata" -> 'previousAddress' -> 'sameAsShipping',
		'changedFields', COALESCE(
			(
				SELECT jsonb_agg(k ORDER BY k)
				FROM jsonb_object_keys(COALESCE("metadata" -> 'newAddress', '{}'::jsonb)) AS k
			),
			'[]'::jsonb
		),
		'piiScrubbedByMigration', to_jsonb(true)
	)
)
WHERE "action" = 'ADDRESS_UPDATED'
	AND ("metadata" ? 'previousAddress' OR "metadata" ? 'newAddress');
