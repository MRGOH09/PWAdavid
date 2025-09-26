// 这是一个Node.js脚本，用于生成PWA图标
// 运行: node create-icons.js

const fs = require('fs');
const path = require('path');

// 创建简单的SVG图标模板
function createSVGIcon(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.1}" fill="#1677ff"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.3}" fill="#ffffff" opacity="0.2"/>
  <text x="${size/2}" y="${size/2 + size * 0.1}" text-anchor="middle" fill="white" font-family="Arial" font-size="${size * 0.4}" font-weight="bold">💰</text>
</svg>`;
}

// 图标尺寸
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// 创建所有尺寸的SVG图标
sizes.forEach(size => {
  const svg = createSVGIcon(size);
  fs.writeFileSync(path.join(__dirname, `icon-${size}.svg`), svg);
  console.log(`Created icon-${size}.svg`);
});

console.log('\\n所有图标已创建！');
console.log('\\n📱 PWA图标设置说明：');
console.log('1. 将这些SVG文件转换为PNG格式');
console.log('2. 或者使用在线工具: https://realfavicongenerator.net/');
console.log('3. 上传一个512x512的图片，自动生成所有尺寸');
console.log('\\n💡 临时方案：当前使用SVG图标，现代浏览器支持');