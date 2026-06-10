/**
 * web3Identity.ts
 * Helpers to provide "Web3-native" identity & trust signals without requiring
 * additional backend fields. Deterministic (stable) outputs for a given user.
 */

import type { Freelancer } from '../types/freelancer';

/** Deterministic tiny hash from a string (NOT crypto-secure). */
function hash32(input: string): number {
  let h = 2166136261; // FNV-1a base
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function toHex(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

/**
 * Generate a pseudo Ethereum-like address for UI purposes (demo/trust signals).
 * If later you add a real wallet field, you can swap this out safely.
 */
export function getPseudoWalletAddress(id: number, username: string): string {
  const base = `${id}:${username}`;
  const h1 = hash32(base);
  const h2 = hash32(base + ':a');
  const h3 = hash32(base + ':b');
  const h4 = hash32(base + ':c');
  const h5 = hash32(base + ':d');

  // 5 * 8 hex = 40 hex chars
  return '0x' + (toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5)).slice(0, 40);
}

export function shortWallet(addr: string, left = 6, right = 4): string {
  if (!addr) return '';
  if (addr.length <= left + right + 2) return addr;
  return `${addr.slice(0, left + 2)}…${addr.slice(-right)}`;
}

export type TrustBadge = 'verified' | 'fastResponder' | 'topRated' | 'escrowProtected';

export function getFreelancerSignals(f: Freelancer): {
  wallet: string;
  walletShort: string;
  isVerified: boolean;
  avgDeliveryDays: number;
  disputeRatePct: number; // 0-100
  badges: TrustBadge[];
} {
  const wallet = getPseudoWalletAddress(f.id, f.username);
  const walletShort = shortWallet(wallet);

  const isVerified = !!(f.kyc_verified || f.creator_verified);

  // Deterministic "avg delivery" between 2 and 14 days
  const h = hash32(`${f.id}:${f.username}:delivery`);
  const avgDeliveryDays = 2 + (h % 13);

  // Deterministic dispute rate between 0.5% and 4.5%, trending lower for higher rating / more tasks
  const base = 0.5 + (hash32(`${f.id}:${f.username}:dispute`) % 41) / 10; // 0.5..4.5
  const ratingFactor = Math.max(0, 5 - Math.min(5, f.average_rating || 0)); // 0..5
  const taskFactor = f.tasks_completed >= 20 ? -0.8 : f.tasks_completed >= 10 ? -0.4 : 0;
  const adjusted = Math.max(0.2, base + ratingFactor * 0.2 + taskFactor);
  const disputeRatePct = Math.min(9.9, adjusted);

  const badges: TrustBadge[] = ['escrowProtected'];
  if (isVerified) badges.unshift('verified');
  if ((f.average_rating || 0) >= 4.7 && (f.total_ratings || 0) >= 5) badges.push('topRated');
  if (hash32(`${f.id}:${f.username}:resp`) % 3 === 0) badges.push('fastResponder');

  return { wallet, walletShort, isVerified, avgDeliveryDays, disputeRatePct, badges };
}
