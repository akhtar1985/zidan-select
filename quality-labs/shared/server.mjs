#!/usr/bin/env node
/** Minimal, dependency-free static server used by the Demo Lab. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './common.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

export function startServer(options = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      const url = decodeURIComponent((request.url || '/').split('?')[0].split('#')[0]);
      let file = path.resolve(root, '.' + (url === '/' ? '/index.html' : url));
      if (!file.startsWith(root + path.sep) && file !== root) {
        response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Forbidden');
        return;
      }
      fs.stat(file, (error, stat) => {
        if (!error && stat.isDirectory()) file = path.join(file, 'index.html');
        fs.readFile(file, (readError, buffer) => {
          if (readError) {
            response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            response.end('404 ' + url);
            return;
          }
          response.writeHead(200, {
            'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store'
          });
          response.end(buffer);
        });
      });
    });
    server.on('error', reject);
    server.listen(options.port || 0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        url: 'http://127.0.0.1:' + address.port + '/',
        port: address.port,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
  });
}
