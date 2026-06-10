/**
 * XDR unsigned para contrato ArcusX WASM (Fase S2).
 * Solo activo con ESCROW_BACKEND=native_wasm + ARCUSX_ESCROW_WASM_HASH.
 *
 * Deploy/initialize con struct EscrowConfig: usar stellar contract bindings (E1.1b).
 * Operaciones con args simples: fund, complete_milestone, approve_milestone, release, dispute, resolve.
 */

import {
  Address,
  BASE_FEE,
  Contract,
  nativeToScVal,
  rpc,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { assertEscrowBackendForNative } from './escrow-backend.ts';
import { quoteFees } from './fees.ts';
import { getStellarConfig } from './stellar-network.ts';
import type { TwDistribution } from './trustless-work-api.ts';

export interface NativeWasmConfig {
  wasmHash: string;
  networkPassphrase: string;
  horizonUrl: string;
}

export function getNativeWasmConfig(): NativeWasmConfig {
  assertEscrowBackendForNative();
  const wasmHash = (Deno.env.get('ARCUSX_ESCROW_WASM_HASH') ?? '').trim();
  if (!wasmHash) {
    throw new Error('ARCUSX_ESCROW_WASM_HASH no configurado');
  }
  const { networkPassphrase, horizonUrl } = getStellarConfig();
  return { wasmHash, networkPassphrase, horizonUrl };
}

function assertContractId(contractId: string): void {
  if (!contractId.startsWith('C') || contractId.length !== 56) {
    throw new Error(`contract_id debe ser C…, recibido: ${contractId.slice(0, 8)}…`);
  }
}

function assertStellarG(address: string, label: string): void {
  if (!address.startsWith('G') || address.length !== 56) {
    throw new Error(`${label} debe ser dirección G…`);
  }
}

/** USDC humano → stroops (7 decimales), paridad contrato. */
export function usdcToStroops(amount: number): bigint {
  const n = Math.round(amount * 1e7);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Monto USDC inválido');
  }
  return BigInt(n);
}

async function loadSourceAccount(signer: string, horizonUrl: string) {
  const server = new rpc.Server(horizonUrl);
  return server.getAccount(signer);
}

async function buildContractCallXdr(params: {
  contractId: string;
  signer: string;
  method: string;
  args: xdr.ScVal[];
}): Promise<string> {
  const { networkPassphrase, horizonUrl } = getNativeWasmConfig();
  assertContractId(params.contractId);
  assertStellarG(params.signer, 'signer');

  const source = await loadSourceAccount(params.signer, horizonUrl);
  const contract = new Contract(params.contractId);
  const op = contract.call(params.method, ...params.args);

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(op)
    .setTimeout(180)
    .build();

  return tx.toXDR();
}

/** Deploy + initialize: pendiente bindings TS — no usar en prod hasta E1.1b. */
export function prepareNativeDeployNotImplemented(): never {
  getNativeWasmConfig();
  throw new Error(
    'Deploy WASM ArcusX: generar bindings desde arcusx-escrow.wasm (stellar contract bindings typescript). ' +
      'Hasta entonces usar ESCROW_BACKEND=tw o deploy manual testnet.',
  );
}

export interface PrepareNativeFundParams {
  contractId: string;
  signer: string;
  /** Monto humano = client_total (quoteFees) */
  clientTotalUsdc: number;
}

export async function prepareNativeFund(
  params: PrepareNativeFundParams,
): Promise<{ unsignedFundXdr: string }> {
  const stroops = usdcToStroops(params.clientTotalUsdc);
  const unsignedFundXdr = await buildContractCallXdr({
    contractId: params.contractId,
    signer: params.signer,
    method: 'fund',
    args: [
      Address.fromString(params.signer).toScVal(),
      nativeToScVal(stroops, { type: 'i128' }),
    ],
  });
  return { unsignedFundXdr };
}

export async function prepareNativeCompleteMilestone(params: {
  contractId: string;
  serviceProvider: string;
}): Promise<{ unsignedCompleteXdr: string }> {
  const unsignedCompleteXdr = await buildContractCallXdr({
    contractId: params.contractId,
    signer: params.serviceProvider,
    method: 'complete_milestone',
    args: [Address.fromString(params.serviceProvider).toScVal()],
  });
  return { unsignedCompleteXdr };
}

export async function prepareNativeApproveMilestone(params: {
  contractId: string;
  approver: string;
}): Promise<{ unsignedApproveXdr: string }> {
  const unsignedApproveXdr = await buildContractCallXdr({
    contractId: params.contractId,
    signer: params.approver,
    method: 'approve_milestone',
    args: [Address.fromString(params.approver).toScVal()],
  });
  return { unsignedApproveXdr };
}

export async function prepareNativeRelease(params: {
  contractId: string;
  releaseSigner: string;
}): Promise<{ unsignedReleaseXdr: string }> {
  const unsignedReleaseXdr = await buildContractCallXdr({
    contractId: params.contractId,
    signer: params.releaseSigner,
    method: 'release',
    args: [Address.fromString(params.releaseSigner).toScVal()],
  });
  return { unsignedReleaseXdr };
}

export async function prepareNativeDispute(params: {
  contractId: string;
  signer: string;
}): Promise<{ unsignedDisputeXdr: string }> {
  const unsignedDisputeXdr = await buildContractCallXdr({
    contractId: params.contractId,
    signer: params.signer,
    method: 'dispute',
    args: [Address.fromString(params.signer).toScVal()],
  });
  return { unsignedDisputeXdr };
}

/** Construye ScVal vec de Distribution para resolve. */
function distributionsToScVal(
  distributions: TwDistribution[],
): xdr.ScVal {
  const entries = distributions.map((d) => {
    const map = new Map([
      [
        xdr.ScSymbol.fromStr('address'),
        Address.fromString(d.address).toScVal(),
      ],
      [
        xdr.ScSymbol.fromStr('amount'),
        nativeToScVal(usdcToStroops(d.amount), { type: 'i128' }),
      ],
    ]);
    return xdr.ScVal.scvMap(map);
  });
  return nativeToScVal(entries, { type: 'vec' });
}

export async function prepareNativeResolve(params: {
  contractId: string;
  disputeResolver: string;
  distributions: TwDistribution[];
}): Promise<{ unsignedResolveXdr: string }> {
  if (!params.distributions.length) {
    throw new Error('distributions requerido');
  }
  const unsignedResolveXdr = await buildContractCallXdr({
    contractId: params.contractId,
    signer: params.disputeResolver,
    method: 'resolve',
    args: [
      Address.fromString(params.disputeResolver).toScVal(),
      distributionsToScVal(params.distributions),
    ],
  });
  return { unsignedResolveXdr };
}

/** Quote bilateral + validación mínima antes de fund WASM. */
export function validateNativeFundAmount(
  workerAmountUsdc: number,
  clientTotalUsdc: number,
  clientFeeBps = 150,
  freelancerFeeBps = 150,
): void {
  const q = quoteFees(workerAmountUsdc, clientFeeBps, freelancerFeeBps);
  const expected = parseFloat(q.client_total);
  const delta = Math.abs(clientTotalUsdc - expected);
  if (delta > 0.0000001) {
    throw new Error(
      `client_total debe ser ${q.client_total} (bilateral bps), recibido: ${clientTotalUsdc}`,
    );
  }
}
