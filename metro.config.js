const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// WebAssembly (.wasm) ファイルを読み込めるようにする設定
config.resolver.assetExts.push('wasm');

// WebブラウザでSQLiteを動かすためのセキュリティ設定（必須）
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return middleware(req, res, next);
  };
};

module.exports = config;