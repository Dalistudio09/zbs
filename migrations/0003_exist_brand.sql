-- Rebrand leftover AROMA / TÜN store rows to EXIST.
-- Admin login/password is migrated in app bootstrap (needs a hashed password).
update stores
set brand_name = 'EXIST',
    bot_username = case
      when bot_username in ('aroma_kz', 'AROMA', 'aroma') then 'exist_bar'
      else bot_username
    end,
    seller_telegram = case
      when seller_telegram in ('aroma_kz', 'AROMA', 'aroma') then 'exist_bar'
      else seller_telegram
    end,
    updated_at = now()
where brand_name in ('AROMA', 'Aroma', 'TÜN', 'TUN', 'Tün');
