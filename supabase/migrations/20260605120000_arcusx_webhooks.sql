-- Partner webhooks v0.3 — push events to integrators
-- Plan: docs/sdk/V0_3_PERFECT_INTEGRATION.md

ALTER TABLE arcusx_partners
  ADD COLUMN IF NOT EXISTS webhook_secret text,
  ADD COLUMN IF NOT EXISTS webhook_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS arcusx_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES arcusx_partners(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  webhook_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'delivered', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  response_status int,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS arcusx_webhook_deliveries_partner_created_idx
  ON arcusx_webhook_deliveries (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS arcusx_webhook_deliveries_pending_idx
  ON arcusx_webhook_deliveries (status, created_at)
  WHERE status = 'pending';

COMMENT ON TABLE arcusx_webhook_deliveries IS 'Outbound webhook delivery log for B2B partners';
