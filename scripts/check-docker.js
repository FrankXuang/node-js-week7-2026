const { execSync } = require('child_process');

try {
  execSync('docker info', { stdio: 'ignore' });
} catch {
  console.error('');
  console.error('⛔ Docker 沒有在跑 —— 請先打開 Docker Desktop，等鯨魚圖示穩定後再跑一次 npm start');
  console.error('');
  process.exit(1);
}
