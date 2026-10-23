const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Loại trừ thư mục web owner khỏi phạm vi quét và đóng gói của Metro bundler
const ownerDir = path.resolve(__dirname, 'owner');
config.resolver.blockList = [
  new RegExp(`^${ownerDir.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}(/.*)?$`),
];

module.exports = config;
