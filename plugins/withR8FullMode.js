// plugins/withR8FullMode.js
const { withGradleProperties } = require('@expo/config-plugins');

module.exports = function withR8FullMode(config) {
  return withGradleProperties(config, (config) => {
    config.modResults.push({
      type: 'property',
      key: 'android.enableR8.fullMode',
      value: 'true',
    });
    return config;
  });
};