module.exports = {
  apps: [{
    name: "barter_apps",
    script: "npm",
    args: "start",
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
};
