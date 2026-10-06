-- "Cuenta de ahorro" as a payout destination for the seller — a lot of
-- people in Chile (BancoEstado especially) get paid into one, and the
-- bank-details form only offered corriente and vista/RUT.
alter type account_type add value if not exists 'savings_account';
