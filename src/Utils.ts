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

// Taken from
// https://github.com/valentine195/obsidian-leaflet-plugin/blob/01fbecdb99a0372dbae2786039db82922ea5d4d8/src/utils/utils.ts#L55.
export const getUniqueId = (): string =>
  "ID_xyxyxyxyxyxy".replace(/[xy]/g, (c) => {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const getPlatform = (): SupportedPlatform =>
  nodePlatformToPlatform("linux");
