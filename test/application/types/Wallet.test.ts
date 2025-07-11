import { Wallet } from '../../../src/application/types/Wallet';
import config from '../../../src/config';

describe('Wallet', () => {
  const TEST_MNEMONIC = 'test test test test test test test test test test test ball';
  let wallet: any;

  beforeEach(() => {
    config.BLOCKCHAIN_NETWORK = 'testnet';
  });

  it('should return the mnemonic', () => {
    wallet = new Wallet(TEST_MNEMONIC);
    expect(wallet.getMnemonic()).toBe(TEST_MNEMONIC);
  });

  it('should return the expected master secret key', async () => {
    wallet = new Wallet(TEST_MNEMONIC);
    const key = await wallet.getMasterSecretKey();
    expect(key.toString('hex')).toBe(
      '3016401f710b4e57bc41a65ae853756c6bb87b91309ccd7cab7f9bf4aefd486b',
    );
  });

  it('should return the expected public synthetic key', async () => {
    wallet = new Wallet(TEST_MNEMONIC);
    const key = await wallet.getPublicSyntheticKey();
    expect(key.toString('hex')).toBe(
      'aa5b2a88de3885ada96bf2d4e3bde4385d4401f0fcc86326454e78651c755a597ce15d16e9570f4cd9b30d0a34f703a1',
    );
  });

  it('should return the expected private synthetic key', async () => {
    wallet = new Wallet(TEST_MNEMONIC);
    const key = await wallet.getPrivateSyntheticKey();
    expect(key.toString('hex')).toBe(
      '6b2f510ff5a9edafde155623bc19ba49f079d1b3c52443bb40dfc41ebcfff52b',
    );
  });

  it('should return the expected owner puzzle hash', async () => {
    wallet = new Wallet(TEST_MNEMONIC);
    const hash = await wallet.getPuzzleHash();
    expect(hash.toString('hex')).toBe(
      '2485e1f2023ba59d36c63e2e52d3654d5d6a599773c82ba0895a3e74e7903550',
    );
  });

  it('should return the expected owner public key for mainet', async () => {
    wallet = new Wallet(TEST_MNEMONIC);
    config.BLOCKCHAIN_NETWORK = 'mainnet';
    const pub = await wallet.getOwnerPublicKey();
    expect(pub).toBe('xch1yjz7rusz8wje6dkx8ch995m9f4wk5kvhw0yzhgyftgl8feusx4gq820cf2');
  });

  it('should return the expected owner public key for testnet', async () => {
    wallet = new Wallet(TEST_MNEMONIC);
    config.BLOCKCHAIN_NETWORK = 'testnet';
    const pub = await wallet.getOwnerPublicKey();
    expect(pub).toBe('txch1yjz7rusz8wje6dkx8ch995m9f4wk5kvhw0yzhgyftgl8feusx4gq2dgwge');
  });

  it('should return the expected key ownership signature', async () => {
    wallet = new Wallet(TEST_MNEMONIC);
    const sig = await wallet.createKeyOwnershipSignature('nonce123');
    expect(sig).toBe(
      'a88c13c667ac01702e1629dc6aef9215239e4b1d09eb9533a43989850713e15444ff886c4d86f14841880c52ab3bffd90ebf63c2986b27ee0450dc04ee29aef9c01de29ec7d879d6d3fa269aaf8706894bdefa1fd09c03b4464ee7b2017703ee',
    );
  });
});
