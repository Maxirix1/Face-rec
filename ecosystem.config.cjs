const path = require('path');

module.exports = {
  apps: [{
    name: 'face',
    cwd: __dirname,
    script: path.join('scripts', 'start.mjs'),
    env: {
      PORT: '5188',
      HOST: '0.0.0.0',
      NODE_ENV: 'production',
    },
  }],
};
