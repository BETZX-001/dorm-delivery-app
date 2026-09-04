// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// บังคับให้ Metro ใช้วิธี resolve แบบเดิม (main/browser field)
// แทนที่จะใช้ "exports" field ของ package.json
// เพื่อให้ firebase resolve ไปที่เวอร์ชัน React Native ที่ถูกต้อง
config.resolver.unstable_enablePackageExports = false;

module.exports = config;