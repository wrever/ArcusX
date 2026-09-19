-- Comisión bilateral UX: ArcusX 3.7% + TW 0.3% = 4% on-chain; empleador ve +2%, trabajador ve −2%
UPDATE public.arcusx_system_config
SET
  config_value = '0.037',
  updated_at = now()
WHERE config_key = 'platform_fee';

INSERT INTO public.arcusx_system_config (config_key, config_value, updated_at)
SELECT 'platform_fee', '0.037', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.arcusx_system_config WHERE config_key = 'platform_fee'
);
