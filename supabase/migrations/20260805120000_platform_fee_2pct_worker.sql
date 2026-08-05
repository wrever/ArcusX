-- Fee model: 2% total deducted from worker (ArcusX 1.7% + 0.3% operation).
-- Employer funds nominal with no platform surcharge.
UPDATE public.arcusx_system_config
SET
  config_value = '0.017',
  updated_at = now()
WHERE config_key = 'platform_fee';

INSERT INTO public.arcusx_system_config (config_key, config_value, updated_at)
SELECT 'platform_fee', '0.017', now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.arcusx_system_config WHERE config_key = 'platform_fee'
);
