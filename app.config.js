// The web build can live in a sub-folder (GitHub Pages: /schetik) or at a domain root.
// EXPO_BASE_URL is set by the deploy workflow; locally it stays empty.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || '' },
});
