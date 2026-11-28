#!/usr/bin/env node
/**
 * Small Chrome DevTools Protocol harness (no Playwright/Puppeteer dependency).
 *
 * It launches an installed Chrome/Edge in headless mode, opens a page target,
 * collects console/exception/network diagnostics and exposes evaluate/keyboard/
 * screenshot helpers. That is enough for the Demo Lab's real-browser checks
 * while keeping the repository dependency-free.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { root } from './common.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

class CDP {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  open() {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;
      const timer = setTimeout(() => reject(new Error('CDP connect timeout: ' + this.url)), 10000);
      socket.addEventListener('open', () => { clearTimeout(timer); resolve(); });
      socket.addEventListener('error', (event) => { clearTimeout(timer); reject(new Error('CDP socket error: ' + (event.message || 'unknown'))); });
      socket.addEventListener('message', (event) => this.onMessage(event.data));
      socket.addEventListener('close', () => {
        for (const entry of this.pending.values()) entry.reject(new Error('CDP socket closed'));
        this.pending.clear();
      });
    });
  }

  onMessage(data) {
    let message;
    try { message = JSON.parse(typeof data === 'string' ? data : data.toString()); } catch (error) { return; }
    if (message.id && this.pending.has(message.id)) {
      const entry = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message + ' (' + message.error.code + ')'));
      else entry.resolve(message.result || {});
      return;
    }
    if (message.method) {
      for (const handler of this.listeners.get(message.method) || []) handler(message.params || {});
    }
  }

  send(method, params = {}, timeout = 30000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, handler) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(handler);
  }

  waitFor(method, predicate = () => true, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const handler = (params) => {
        if (!predicate(params)) return;
        clearTimeout(timer);
        const list = this.listeners.get(method) || [];
        this.listeners.set(method, list.filter((entry) => entry !== handler));
        resolve(params);
      };
      this.on(method, handler);
      const timer = setTimeout(() => reject(new Error('CDP event timeout: ' + method)), timeout);
    });
  }

  close() {
    try { this.socket && this.socket.close(); } catch (error) { /* ignore */ }
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('HTTP ' + response.status + ' for ' + url);
  return response.json();
}

export async function launch(options = {}) {
  const executable = options.executable || findBrowser();
  if (!executable) throw new Error('No Chrome/Edge executable found. Set CHROME_PATH to a Chromium browser.');
  const profile = fs.mkdtempSync(path.join(root, '.build', 'lab-browser-'));
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-extensions',
    '--mute-audio',
    '--hide-crash-restore-bubble',
    '--window-size=1440,1000',
    '--user-data-dir=' + profile,
    '--remote-debugging-port=0',
    'about:blank'
  ];
  if (process.getuid && process.getuid() === 0) args.unshift('--no-sandbox');
  const child = spawn(executable, args, { stdio: 'ignore', windowsHide: true });
  const portFile = path.join(profile, 'DevToolsActivePort');
  const deadline = Date.now() + 25000;
  let portText = null;
  while (!portText) {
    if (Date.now() > deadline) {
      killTree(child);
      throw new Error('Chrome did not open a DevTools port (profile ' + profile + ')');
    }
    if (child.exitCode !== null) throw new Error('Chrome exited early with code ' + child.exitCode);
    try {
      portText = fs.readFileSync(portFile, 'utf8').trim();
    } catch (error) {
      if (error.code !== 'EBUSY' && error.code !== 'ENOENT') {
        killTree(child);
        throw error;
      }
    }
    if (!portText) await sleep(100);
  }
  const [portLine, browserPath] = portText.split(/\r?\n/);
  const port = Number(portLine);
  const browserCdp = new CDP('ws://127.0.0.1:' + port + browserPath);
  await browserCdp.open();

  let target;
  try {
    target = await fetchJson('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' });
  } catch (error) {
    target = await fetchJson('http://127.0.0.1:' + port + '/json/new?about:blank');
  }
  const page = new CDP(target.webSocketDebuggerUrl);
  await page.open();
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  await page.send('Log.enable');
  await page.send('Network.enable');
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  const diagnostics = {
    console: [],
    exceptions: [],
    log: [],
    requestsFailed: [],
    responsesFailed: [],
    requestUrls: new Map()
  };
  page.on('Network.requestWillBeSent', (event) => {
    if (event.requestId && event.request) diagnostics.requestUrls.set(event.requestId, event.request.url);
  });
  page.on('Runtime.consoleAPICalled', (event) => {
    diagnostics.console.push({ type: event.type, text: (event.args || []).map((arg) => arg.value ?? arg.description ?? arg.type).join(' ') });
  });
  page.on('Runtime.exceptionThrown', (event) => {
    const detail = event.exceptionDetails || {};
    diagnostics.exceptions.push({ text: detail.text || '', description: detail.exception ? detail.exception.description : '', url: detail.url || '', line: detail.lineNumber });
  });
  page.on('Log.entryAdded', (event) => {
    if (event.entry) diagnostics.log.push({ level: event.entry.level, text: event.entry.text, url: event.entry.url || '' });
  });
  page.on('Network.loadingFailed', (event) => {
    diagnostics.requestsFailed.push({
      requestId: event.requestId,
      url: diagnostics.requestUrls.get(event.requestId) || '',
      errorText: event.errorText,
      canceled: !!event.canceled,
      type: event.type
    });
  });
  page.on('Network.responseReceived', (event) => {
    if (event.response && event.response.status >= 400) {
      diagnostics.responsesFailed.push({ url: event.response.url, status: event.response.status });
    }
  });

  async function evaluate(expression) {
    const result = await page.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) {
      const description = result.exceptionDetails.exception ? result.exceptionDetails.exception.description : result.exceptionDetails.text;
      throw new Error('Evaluation failed: ' + description);
    }
    return result.result ? result.result.value : undefined;
  }

  async function navigate(url) {
    diagnostics.console.length = 0;
    diagnostics.exceptions.length = 0;
    diagnostics.log.length = 0;
    diagnostics.requestsFailed.length = 0;
    diagnostics.responsesFailed.length = 0;
    diagnostics.requestUrls.clear();
    const loaded = page.waitFor('Page.loadEventFired', () => true, 30000);
    await page.send('Page.navigate', { url });
    await loaded;
    await sleep(700);
    return evaluate('document.readyState');
  }

  async function key(key, code, keyCode) {
    await page.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
    await sleep(120);
  }

  async function click(selector) {
    const selectorJson = JSON.stringify(selector);
    await evaluate('(function(){var el=document.querySelector(' + selectorJson + ');if(el)el.scrollIntoView({block:"center",inline:"center",behavior:"instant"});return !!el;})()');
    await sleep(120);
    const rect = await evaluate('(function(){var el=document.querySelector(' + selectorJson + ');if(!el)return null;var r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};})()');
    if (!rect || rect.w === 0 || rect.h === 0) throw new Error('Cannot click invisible/missing element: ' + selector);
    const x = rect.x;
    const y = rect.y;
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(200);
  }

  async function typeText(text) {
    await page.send('Input.insertText', { text });
    await sleep(120);
  }

  async function screenshot(filePath) {
    const shot = await page.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
    return filePath;
  }

  async function setViewport(width, height, mobile = false) {
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    await sleep(250);
  }

  async function close() {
    try { await browserCdp.send('Browser.close', {}, 5000); } catch (error) { /* ignore */ }
    await sleep(400);
    page.close();
    browserCdp.close();
    if (child.exitCode === null) killTree(child);
  }

  return { executable, port, page, diagnostics, evaluate, navigate, key, click, typeText, screenshot, setViewport, close };
}

function killTree(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try { child.kill('SIGKILL'); } catch (error) { /* ignore */ }
  }
}

export { sleep };
