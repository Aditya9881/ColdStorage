const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '../shared');

const config = getDefaultConfig(projectRoot);

// Allow Metro to resolve modules from the shared/ directory
config.watchFolders = [sharedRoot];

// Ensure node_modules resolution still works from the project root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// Ignore macOS AppleDouble metadata files (._* and .__*)
const originalBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(originalBlockList) ? originalBlockList : originalBlockList ? [originalBlockList] : []),
  /.*\/\._.*/,
  /.*\/\.__.*/,
];

module.exports = config;

