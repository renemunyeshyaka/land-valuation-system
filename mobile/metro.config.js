const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Some Metro/Expo version combinations can provide a non-function value here,
// but Metro Server expects a function.
if (!config.serializer || typeof config.serializer !== 'object') {
  config.serializer = {};
}
if (typeof config.serializer.isThirdPartyModule !== 'function') {
  config.serializer.isThirdPartyModule = () => false;
}

module.exports = config;
