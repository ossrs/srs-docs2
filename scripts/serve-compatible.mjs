import {createReadStream, existsSync, statSync} from 'node:fs';
import {createServer} from 'node:http';
import {extname, join, normalize, resolve, sep} from 'node:path';

const args = process.argv.slice(2);

function option(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const host = option('--host', '127.0.0.1');
const port = Number(option('--port', '3000'));
const buildRoot = resolve(option('--dir', join(import.meta.dirname, '..', 'build')));

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
};

function redirect(response, location, statusCode = 302) {
  response.writeHead(statusCode, {Location: location, 'Content-Type': 'text/plain; charset=utf-8'});
  response.end(`Redirecting to ${location}\n`);
}

function compatibilityRedirect(pathname) {
  if (pathname === '/') return '/lts/en-us/';
  if (pathname === '/lts' || pathname === '/lts/') return '/lts/en-us/';
  if (pathname === '/lts/en-us') return {location: '/lts/en-us/', statusCode: 301};
  if (pathname === '/lts/zh-cn') return {location: '/lts/zh-cn/', statusCode: 301};

  const nestedEnglish = pathname.match(/^\/lts\/zh-cn\/en-us(\/.*)?$/);
  if (nestedEnglish) return `/lts/en-us${nestedEnglish[1] ?? ''}`;
  const nestedChinese = pathname.match(/^\/lts\/en-us\/zh-cn(\/.*)?$/);
  if (nestedChinese) return `/lts/zh-cn${nestedChinese[1] ?? ''}`;

  const localeLessCollection = pathname.match(/^\/lts\/(docs|blog)(\/.*)?$/);
  if (localeLessCollection) {
    return `/lts/en-us/${localeLessCollection[1]}${localeLessCollection[2] ?? ''}`;
  }

  const localeLessPage = pathname.match(
    /^\/lts\/(about|contact|faq|guide|how-to-file-pr|license|product|security-advisories|cloud)(?:\/.*)?$/,
  );
  if (localeLessPage) return `/lts/en-us/${localeLessPage[1]}`;
  if (pathname.startsWith('/oryx')) return '/lts/en-us/docs/v6/doc/getting-started-oryx';

  return undefined;
}

function resolveStaticFile(pathname) {
  const route = pathname.match(/^\/lts\/(en-us|zh-cn)(\/.*)?$/);
  if (!route) return undefined;

  const localeRoot = resolve(buildRoot, route[1]);
  let relativePath;
  try {
    relativePath = decodeURIComponent(route[2] ?? '/').replace(/^\/+/, '');
  } catch {
    return undefined;
  }
  const normalizedPath = normalize(relativePath);
  const candidate = resolve(localeRoot, normalizedPath);

  if (candidate !== localeRoot && !candidate.startsWith(`${localeRoot}${sep}`)) return undefined;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;

  const indexFile = join(candidate, 'index.html');
  if (existsSync(indexFile) && statSync(indexFile).isFile()) return indexFile;
  return undefined;
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Method Not Allowed\n');
    return;
  }

  let requestedUrl;
  try {
    requestedUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? host}`);
  } catch {
    response.writeHead(400, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Bad Request\n');
    return;
  }
  const {pathname, search} = requestedUrl;

  const redirectTarget = compatibilityRedirect(pathname);
  if (redirectTarget) {
    if (typeof redirectTarget === 'string') redirect(response, `${redirectTarget}${search}`);
    else redirect(response, `${redirectTarget.location}${search}`, redirectTarget.statusCode);
    return;
  }

  const pathParts = pathname.split('/').filter(Boolean);
  if (pathname.endsWith('/') && pathParts.length > 3) {
    const pathWithoutSlash = pathname.slice(0, -1);
    if (resolveStaticFile(pathWithoutSlash)) {
      redirect(response, `${pathWithoutSlash}${search}`);
      return;
    }
  }

  const file = resolveStaticFile(pathname);
  if (!file) {
    response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'});
    response.end('Not Found\n');
    return;
  }

  response.writeHead(200, {
    'Content-Length': statSync(file).size,
    'Content-Type': contentTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving the compatibility preview at http://${host}:${port}/lts/`);
  console.log('  /       -> /lts/en-us/');
  console.log('  /lts/   -> /lts/en-us/');
});
