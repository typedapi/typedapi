set -e

cd core
npm install
npm run build

cd ../server
npm install
npm run build

cd ../server-ws
npm install
npm run build

cd ../client
npm install
npm run build

cd ../parser
npm install
npm run build

cd ../client-browser-http
npm install
npm run build

cd ../client-browser-ws
npm install
npm run build

cd ../redis-signaling
npm install
npm run build