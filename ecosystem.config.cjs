module.exports = {
  apps: [{
    name: 'face',
    cwd: '/root/face',
    script: 'scripts/start.mjs',
    env: { PORT: '5188', HOST: '0.0.0.0', NODE_ENV: 'production' },
  }],
};
