-- Alinear comisión de plataforma a 3 % (0.03). Corrige legacy 0.005 (0.5 %).
UPDATE public.arcusx_system_config
SET
  config_value = '0.03',
  updated_at = now()
WHERE config_key = 'platform_fee'
  AND (
    config_value IS NULL
    OR trim(config_value) = ''
    OR (config_value ~ '^[0-9.]+$' AND config_value::numeric < 0.02)
  );

INSERT INTO public.arcusx_system_config (config_key, config_value, updated_at)
SELECT 'platform_fee', '0.03', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.arcusx_system_config WHERE config_key = 'platform_fee'
);
