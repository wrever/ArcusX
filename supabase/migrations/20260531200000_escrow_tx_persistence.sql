-- Persistencia de contract id y hashes por etapa (deploy / fund / release).

ALTER TABLE public.arcusx_tasks
  ADD COLUMN IF NOT EXISTS escrow_deploy_tx_hash text,
  ADD COLUMN IF NOT EXISTS escrow_fund_tx_hash text,
  ADD COLUMN IF NOT EXISTS escrow_release_tx_hash text;

ALTER TABLE public.arcusx_agreements
  ADD COLUMN IF NOT EXISTS escrow_deploy_tx_hash text,
  ADD COLUMN IF NOT EXISTS escrow_fund_tx_hash text,
  ADD COLUMN IF NOT EXISTS escrow_release_tx_hash text;

COMMENT ON COLUMN public.arcusx_tasks.escrow_deploy_tx_hash IS 'Tx hash al desplegar contrato Trustless Work';
COMMENT ON COLUMN public.arcusx_tasks.escrow_fund_tx_hash IS 'Tx hash al fondear escrow';
COMMENT ON COLUMN public.arcusx_tasks.escrow_release_tx_hash IS 'Tx hash al liberar fondos al trabajador';
