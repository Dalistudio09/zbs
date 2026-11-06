update stores
set brand_name = 'ZBS parfbar',
    updated_at = now()
where brand_name in ('EXIST', 'AROMA', 'Aroma', 'TÜN', 'TUN', 'Tün');
