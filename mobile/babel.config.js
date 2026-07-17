module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // must remain last in the plugins list per react-native-reanimated setup
    plugins: ['react-native-reanimated/plugin'],
  };
};
