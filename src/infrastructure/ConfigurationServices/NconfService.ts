import nconf from 'nconf';
import fs from 'fs-extra';
import { Mutex } from 'async-mutex';
import path from 'path';
import { IConfigurationService } from '../../application/interfaces/IConfigurationService';
import config from '../../config';

const fileMutex = new Mutex();

export class NconfService implements IConfigurationService {
  private configFilePath: string;

  constructor(relativePath: string) {
    this.configFilePath = path.join(config.DIG_FOLDER_PATH, relativePath);
    this.initializeConfig();
  }

  public async getConfigValue<T>(key: string): Promise<T | null> {
    await this.initializeConfig();
    const value = nconf.get(key);
    return value !== undefined ? value : null;
  }

  public async setConfigValue(key: string, value: unknown): Promise<void> {
    await this.initializeConfig();
    nconf.set(key, value);
    await new Promise((resolve, reject) =>
      nconf.save((err: unknown) => (err ? reject(err) : resolve(undefined))),
    );
  }

  public async deleteConfigValue(key: string): Promise<boolean> {
    await this.initializeConfig();
    const value = nconf.get(key);

    if (value === undefined) {
      return false;
    }

    nconf.clear(key);
    await new Promise((resolve, reject) =>
      nconf.save((err: unknown) => (err ? reject(err) : resolve(undefined))),
    );

    return true;
  }

  public async configExists(): Promise<boolean> {
    return await fs.pathExists(this.configFilePath);
  }

  // Method to get the full configuration as a key-value object
  public async getFullConfig(): Promise<Record<string, nconf.ICallbackFunction>> {
    await this.initializeConfig();
    return nconf.get() || {};
  }

  private async initializeConfig(): Promise<void> {
    const release = await fileMutex.acquire();
    const directory = path.dirname(this.configFilePath);
    try {
      if (!(await fs.pathExists(directory))) {
        await fs.mkdirp(directory);
      }

      if (!(await fs.pathExists(this.configFilePath))) {
        await fs.writeFile(this.configFilePath, '{}');
      }
    } finally {
      release();
    }
    nconf.file({ file: this.configFilePath });
  }
}
