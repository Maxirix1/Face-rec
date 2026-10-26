module.exports = {
  apps: [{
    name: 'face',
    cwd: '/root/face',
    script: 'scripts/start.mjs',
    env: { PORT: '5188', NODE_ENV: 'production' },
  }],
};
