export type SupportedDesktopPlatform = "mac" | "windows" | "linux";
export type SupportedMobilePlatform = "ios" | "android";
export type SupportedPlatform =
  | SupportedDesktopPlatform
  | SupportedMobilePlatform;

export type CallbackId = string;
export type CallbackRegistry<CB> = Map<CallbackId, CB>;
