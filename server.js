const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const pricing = require('./pricing');

const root = __dirname;
const port = Number(process.env.PORT || 8000);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/script.js', ['script.js', 'text/javascript; charset=utf-8']],
  ['/pricing.js', ['pricing.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`PORT inválida: ${process.env.PORT}`);
}

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url, 'http://localhost').pathname;
  } catch (error) {
    response.writeHead(400);
    response.end('Bad request');
    return;
  }

  if (pathname === '/api/payments') {
    if (request.method !== 'POST') {
      response.writeHead(405, { Allow: 'POST' });
      response.end('Method not allowed');
      return;
    }

    createPayment(request, response);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }

  const file = files.get(pathname);
  if (!file) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const [filename, contentType] = file;
  fs.readFile(path.join(root, filename), (error, contents) => {
    if (error) {
      console.error(`Falha ao ler ${filename}:`, error);
      response.writeHead(500);
      response.end('Internal server error');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': contents.length,
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  });
});

function sendJson(response, statusCode, data) {
  const contents = Buffer.from(JSON.stringify(data));
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': contents.length,
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(contents);
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > 4096) {
        tooLarge = true;
        body = '';
      }
    });
    request.on('end', () => {
      if (tooLarge) {
        const error = new Error('A solicitação excede o limite permitido.');
        error.statusCode = 413;
        reject(error);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        const error = new Error('Envie um JSON válido.');
        error.statusCode = 400;
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

async function createPayment(request, response) {
  let payment;
  try {
    payment = await readJsonBody(request);
  } catch (error) {
    if (!response.headersSent && !response.destroyed) {
      sendJson(response, error.statusCode || 400, { error: error.message || 'Não foi possível ler a solicitação.' });
    }
    return;
  }

  if (!payment || typeof payment !== 'object' || Array.isArray(payment)) {
    sendJson(response, 400, { error: 'Dados de pagamento inválidos.' });
    return;
  }

  if (typeof payment.hours !== 'number' || !Number.isInteger(payment.hours)
    || payment.hours < pricing.minimumHours || payment.hours > pricing.maximumHours) {
    sendJson(response, 400, { error: `Informe uma duração entre ${pricing.minimumHours} e ${pricing.maximumHours} horas.` });
    return;
  }

  if (!['pix', 'credit_card'].includes(payment.paymentMethod)) {
    sendJson(response, 400, { error: 'Escolha Pix ou cartão de crédito.' });
    return;
  }

  if (typeof payment.plate !== 'string' || !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(payment.plate)) {
    sendJson(response, 400, { error: 'A placa informada é inválida.' });
    return;
  }

  if (typeof payment.spot !== 'string' || !/^(B1-A[0-9]{2}|BUF-[0-9]{2})$/.test(payment.spot)) {
    sendJson(response, 400, { error: 'A vaga informada é inválida.' });
    return;
  }

  const quote = pricing.calculate(payment.hours);
  sendJson(response, 201, {
    paymentId: randomUUID(),
    status: 'simulated',
    paymentMethod: payment.paymentMethod,
    plate: payment.plate,
    spot: payment.spot,
    quote,
    message: 'Pagamento demonstrativo aprovado. Nenhuma cobrança foi realizada.',
  });
}

server.on('error', (error) => {
  console.error('Falha ao iniciar o servidor:', error);
  process.exitCode = 1;
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Iguatemi Smart Parking disponível em http://localhost:${port}`);
});
