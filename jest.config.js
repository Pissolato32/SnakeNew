export default {
  transform: {},
  testEnvironment: 'node',
  transformIgnorePatterns: [
    '/node_modules/(?!(your-esm-package)/)'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
