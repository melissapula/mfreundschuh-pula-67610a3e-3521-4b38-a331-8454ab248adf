const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  // Every `nx test <project>` run generates a coverage report — open
  // coverage/<project>/index.html in a browser to see it. Shared here
  // (not per-project) so every project gets the same reporters for free.
  collectCoverage: true,
  coverageReporters: ['html', 'text-summary', 'lcov'],
};