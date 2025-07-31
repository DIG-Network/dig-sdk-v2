export interface IConfigurationService {
  getConfigValue<T>(key: string): Promise<T | null>;
  setConfigValue(key: string, value: unknown): Promise<void>;
  deleteConfigValue(key: string): Promise<boolean>;
  configExists(): Promise<boolean>;
  getFullConfig(): Promise<Record<string, unknown>>;
}
