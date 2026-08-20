// Overlays app.json so the same config can build both ways.
//
// GitHub Pages serves a project site from a subpath
// (https://<user>.github.io/<repo>/), not the domain root, so every bundled
// asset URL has to be prefixed with that repo name or the page loads a blank
// screen full of 404s. That prefix is wrong for local development, which
// serves from the root, so it is applied only when WAGMATE_BASE_URL is set —
// which the deploy workflow does and nothing else does.
const appJson = require('./app.json');

module.exports = () => {
  const baseUrl = process.env.WAGMATE_BASE_URL;

  return {
    ...appJson.expo,
    ...(baseUrl
      ? { experiments: { ...appJson.expo.experiments, baseUrl } }
      : {}),
  };
};
