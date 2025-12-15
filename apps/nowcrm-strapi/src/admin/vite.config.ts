import { defineConfig, mergeConfig, type UserConfig } from 'vite';

export default (config: UserConfig): UserConfig => {
  return mergeConfig(
    config,
    defineConfig({
      resolve: {
        alias: {
          '@': '/src',
        },
      },
      server: {
        allowedHosts: true,
      },
    })
  );
};