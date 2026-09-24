// plugins/withSingleAbi.js
const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Restricts native library bundling to arm64-v8a only. This is the single
 * biggest size cut for a sideloaded "universal" APK, since without it the
 * build embeds native code for all four Android CPU architectures even
 * though a given phone only ever uses one.
 *
 * Tradeoff: this drops support for 32-bit-only devices (armeabi-v7a) and
 * emulators/x86 devices. Nearly every real Android phone from the last
 * several years is arm64 — the ones excluded are old low-end devices and
 * x86 emulators. If you need to test on an x86 emulator, use the
 * `development` build profile instead, which isn't affected by this.
 */
module.exports = function withSingleAbi(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter(
      (item) => !(item.type === 'property' && item.key === 'reactNativeArchitectures'),
    );
    config.modResults.push({
      type: 'property',
      key: 'reactNativeArchitectures',
      value: 'arm64-v8a',
    });
    return config;
  });
};