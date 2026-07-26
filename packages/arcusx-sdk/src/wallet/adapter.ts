export interface WalletAdapter {
  getAddress(): Promise<string>;
  signTransaction(xdr: string): Promise<string>;
  network: 'testnet' | 'mainnet';
}
