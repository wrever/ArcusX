-- ArcusX 2.7% + Trustless Work protocolo 0.3% = 3% total al cliente
UPDATE public.arcusx_system_config
SET
  config_value = '0.027',
  updated_at = now()
WHERE config_key = 'platform_fee';

INSERT INTO public.arcusx_system_config (config_key, config_value, updated_at)
SELECT 'platform_fee', '0.027', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.arcusx_system_config WHERE config_key = 'platform_fee'
);
