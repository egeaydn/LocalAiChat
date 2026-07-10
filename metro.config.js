const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// lucide-react-native ships ESM (.mjs) files — Metro needs to know about them
config.resolver.sourceExts.push("mjs");

module.exports = config;
