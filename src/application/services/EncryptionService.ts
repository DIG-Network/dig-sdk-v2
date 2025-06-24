// encryption.ts
import * as crypto from 'crypto';
import { EncryptedData } from '../types/EncryptedData';

const ALGORITHM = 'aes-256-gcm';

export class EncryptionService {
  public static encryptData(data: string): EncryptedData {
    const nonce = crypto.randomBytes(12).toString('hex');
    const salt = crypto.randomBytes(16).toString('hex');
    const key = this.generateKey(salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, Buffer.from(nonce, 'hex'));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return { data: encrypted + tag, nonce, salt };
  }

  public static decryptData(encryptedData: EncryptedData): string {
    const { data, nonce, salt } = encryptedData;
    const encryptedText = data.slice(0, -32);
    const tag = Buffer.from(data.slice(-32), 'hex');
    const key = this.generateKey(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(nonce, 'hex'));
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private static generateKey(salt: string): Buffer {
    return crypto.pbkdf2Sync('mnemonic-seed', salt, 100000, 32, 'sha512');
  }
}
