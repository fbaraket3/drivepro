// scripts/dev.js — Starts backend and frontend concurrently
const { execSync } = require('child_process');
const { spawn } = require('child_process');

console.log('🚗 DrivePro — starting dev servers...\n');

const backend = spawn('npm', ['run', 'dev'], {
  cwd: require('path').join(__dirname, '../backend'),
  stdio: 'inherit',
  shell: true,
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: require('path').join(__dirname, '../frontend'),
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});
