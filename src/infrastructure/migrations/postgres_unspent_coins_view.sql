CREATE MATERIALIZED VIEW IF NOT EXISTS unspent_coins AS
SELECT ac.*
FROM added_coin ac
LEFT JOIN spent_coin sc ON ac."coinId" = sc."coinId"
WHERE ac."coinStatus" = 'UNSPENT' AND sc."coinId" IS NULL;
