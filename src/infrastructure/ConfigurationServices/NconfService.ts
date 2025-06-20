import nconf from 'nconf';
import fs from 'fs-extra';
import { Mutex } from 'async-mutex';
import path from 'path';
import os from 'os';
import { IConfigurationService } from '../../application/interfaces/IConfigurationService';

const CONF_FOLDER_PATH = path.join(os.homedir(), '.dig');
const fileMutex = new Mutex();

export class NconfService implements IConfigurationService {
  private configFilePath: string;

  constructor(relativePath: string) {
    this.configFilePath = path.join(CONF_FOLDER_PATH, relativePath);
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
    console.log(`${key} saved to config file.`);
  }

  public async deleteConfigValue(key: string): Promise<void> {
    await this.initializeConfig();
    nconf.clear(key);
    await new Promise((resolve, reject) =>
      nconf.save((err: unknown) => (err ? reject(err) : resolve(undefined))),
    );
    console.log(`${key} deleted from config file.`);
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
        console.log('Directory created:', directory);
      }

      if (!(await fs.pathExists(this.configFilePath))) {
        await fs.writeFile(this.configFilePath, '{}');
        console.log('Configuration file created:', this.configFilePath);
      }
    } finally {
      release();
    }
    nconf.file({ file: this.configFilePath });
  }
}
