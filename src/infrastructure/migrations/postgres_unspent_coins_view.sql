CREATE MATERIALIZED VIEW IF NOT EXISTS unspent_coins AS
SELECT ac.*
FROM coin ac
LEFT JOIN spend sc ON ac."coin_id" = sc."coin_id"
WHERE sc."coin_id" IS NULL;
