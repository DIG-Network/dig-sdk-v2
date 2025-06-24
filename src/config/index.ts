interface DigConfig {
  DIG_FOLDER_PATH: string;
}

const config: DigConfig = {
  DIG_FOLDER_PATH: process.env.DIG_FOLDER_PATH!,
};

export default config;