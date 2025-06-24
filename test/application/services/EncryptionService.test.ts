import { EncryptionService } from '../../../src/application/services/EncryptionService';
import { EncryptedData } from '../../../src/application/types/EncryptedData';

describe('EncryptionService', () => {
  const testString = 'Hello, world!';

  it('should encrypt and decrypt data correctly', () => {
    const encrypted: EncryptedData = EncryptionService.encryptData(testString);
    expect(encrypted).toHaveProperty('data');
    expect(encrypted).toHaveProperty('nonce');
    expect(encrypted).toHaveProperty('salt');
    expect(typeof encrypted.data).toBe('string');
    expect(typeof encrypted.nonce).toBe('string');
    expect(typeof encrypted.salt).toBe('string');

    const decrypted = EncryptionService.decryptData(encrypted);
    expect(decrypted).toBe(testString);
  });

  it('should produce different ciphertext for the same input (random nonce/salt)', () => {
    const encrypted1 = EncryptionService.encryptData(testString);
    const encrypted2 = EncryptionService.encryptData(testString);
    expect(encrypted1.data).not.toBe(encrypted2.data);
    expect(encrypted1.nonce).not.toBe(encrypted2.nonce);
    expect(encrypted1.salt).not.toBe(encrypted2.salt);
  });

  it('should throw if data is tampered with', () => {
    const encrypted = EncryptionService.encryptData(testString);
    // Tamper with the data
    const tampered = { ...encrypted, data: encrypted.data.slice(0, -1) + (encrypted.data.slice(-1) === '0' ? '1' : '0') };
    expect(() => EncryptionService.decryptData(tampered)).toThrow();
  });
});
