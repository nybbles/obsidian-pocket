import { Vault } from "obsidian";
import { SupportedPlatform } from "./Types";

export const openBrowserWindow = (url: string) => window.location.assign(url);

export const ensureFolderExists = async (vault: Vault, path: string) => {
  if (await vault.adapter.exists(path)) {
    return;
  }
  await vault.createFolder(path);
};

const nodePlatformToPlatform = (
  nodePlatform: NodeJS.Platform
): SupportedPlatform => {
  const supportedPlatforms: Record<string, SupportedPlatform> = {
    darwin: "mac",
    win32: "windows",
    linux: "linux",
  };

  const result = supportedPlatforms[nodePlatform as string];
  if (!result) {
    throw new Error("Invalid node platform");
  }
  return result;
};

export const getPlatform = (): SupportedPlatform =>
  nodePlatformToPlatform("linux");
