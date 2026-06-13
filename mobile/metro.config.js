const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const { assetExts, sourceExts } = config.resolver;

// SVG files are handled as React components, not static assets
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

config.resolver = {
  ...config.resolver,
  assetExts: assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...sourceExts, "svg"],
  useWatchman: false,
  resolveRequest: (context, moduleName, platform) => {
    // Fix better-auth ESM resolution: Metro resolves to .cjs but package only ships .mjs
    if (moduleName.includes("better-auth") && moduleName.endsWith(".cjs")) {
      return context.resolveRequest(context, moduleName.replace(/\.cjs$/, ".mjs"), platform);
    }

    // Fix @better-auth/expo incorrectly importing metro-config (dev-time only)
    if (moduleName.includes("@expo/metro-config") || moduleName.includes("async-require")) {
      return { type: "empty" };
    }

    // Mock native-only modules on web
    if (platform === "web") {
      const nativeOnlyModules = [
        "react-native-pager-view",
        "reanimated-tab-view",
        "@bottom-tabs/react-navigation",
      ];
      if (nativeOnlyModules.some((mod) => moduleName.includes(mod))) {
        return { type: "empty" };
      }
    }

    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withNativeWind(config, { input: "./global.css" });
