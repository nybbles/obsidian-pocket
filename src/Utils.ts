import { Vault } from "obsidian";

export const openBrowserWindow = (url: string) => window.location.assign(url);

export const ensureFolderExists = async (vault: Vault, path: string) => {
  if (await vault.adapter.exists(path)) {
    return;
  }
  await vault.createFolder(path);
};
