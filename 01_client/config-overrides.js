const path = require("path");

module.exports = function override(config, env) {
  // 절대 경로 설정
  config.resolve.alias = {
    ...config.resolve.alias,
    "@": path.resolve(__dirname, "src"),
  };

  return config;
};
