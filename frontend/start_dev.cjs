const path = require('node:path');
const { spawn } = require('node:child_process');

const frontendRoot = __dirname;
const webServers = [];
let mobile;
let stopping = false;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;

  if (mobile && mobile.exitCode === null && mobile.signalCode === null) {
    mobile.kill('SIGTERM');
  }

  for (const web of webServers) {
    try {
      await web.close();
    } catch (error) {
      console.error('Không thể đóng web:', error.message);
      code = 1;
    }
  }

  process.exitCode = code;
}

process.once('SIGINT', () => void stop());
process.once('SIGTERM', () => void stop());

async function start() {
  const { createServer } = await import('vite');
  const mobilePort = process.env.AGRITRACE_MOBILE_PORT || '8083';

  for (const [name, mode, port] of [
    ['Owner', 'development', process.env.AGRITRACE_WEB_PORT],
    ['Admin', 'admin', process.env.AGRITRACE_ADMIN_PORT],
  ]) {
    const web = await createServer({
      configFile: path.join(frontendRoot, 'vite.config.mts'),
      mode,
      clearScreen: false,
      ...(port ? { server: { port: Number(port) } } : {}),
    });
    webServers.push(web);
    if (stopping) { await web.close(); return; }
    await web.listen();
    if (stopping) return;
    console.log(`\nWeb ${name} đã chạy:`);
    web.printUrls();
    if (name === 'Admin') console.log('Mở đường dẫn /admin.html để xem trang Admin.');
  }

  if (process.argv.includes('--web-only')) return;
  console.log('\nĐang khởi động app mobile. Mã QR sẽ hiện bên dưới.\n');

  mobile = spawn(process.execPath, [
    path.join(frontendRoot, 'node_modules', 'expo', 'bin', 'cli'),
    'start', '--go', '--port', mobilePort,
  ], {
    cwd: frontendRoot,
    stdio: 'inherit',
    windowsHide: true,
  });

  mobile.once('error', error => {
    console.error('Không thể khởi động mobile:', error.message);
    void stop(1);
  });
  mobile.once('exit', (code, signal) => void stop(signal ? 0 : code ?? 0));
}

start().catch(error => {
  console.error('Không thể khởi động:', error.message);
  void stop(1);
});
