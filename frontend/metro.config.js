const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Keep the Vite apps, skill repositories and build output outside Metro's graph.
const excludedDirs = ['src/(website)', 'skills', 'skill2', 'dist'];
config.resolver.blockList = excludedDirs.map(directory => {
  const absolutePath = path.resolve(__dirname, directory).replace(/\\/g, '/');
  const escapedPath = absolutePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escapedPath.replace(/\//g, '[/\\\\]')}([/\\\\].*)?$`);
});
config.resolver.blockList.push(/_wb\.(?:[jt]sx?|css)$/);

module.exports = config;
