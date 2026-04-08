const path = require('path');
const withAndroidSigning = require('./plugins/withAndroidSigning');

module.exports = ({ config }) => {
  const updatedConfig = {
    ...config,
    icon: path.resolve(__dirname, 'assets/icon.png'),
    splash: {
      ...config.splash,
      image: path.resolve(__dirname, 'assets/splash.png'),
    },
    web: {
      ...config.web,
      favicon: path.resolve(__dirname, 'assets/favicon.png'),
    },
  };
  return withAndroidSigning(updatedConfig);
};
