module.exports = {
  apps: [{
    name: 'home-guard',
    cwd: '/root/home-guard',
    script: 'server.js',
    env: { NODE_ENV: 'production' },
  }],
};
