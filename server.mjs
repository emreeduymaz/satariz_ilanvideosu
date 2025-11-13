import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';

const PORT = Number(process.env.PORT || 4000);
const MAX_JOB_MS = Number(process.env.JOB_TIMEOUT_MS || 10 * 60 * 1000); // 10 minutes
const projectRoot = process.cwd();
let isBusy = false;
let currentChild = null;
let currentTimer = null;

function sendJson(res, statusCode, data) {
	const body = Buffer.from(JSON.stringify(data));
	res.statusCode = statusCode;
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	res.setHeader('Content-Length', String(body.length));
	res.end(body);
}

function parseJsonBody(req) {
	return new Promise((resolve, reject) => {
		let raw = '';
		req.setEncoding('utf8');
		req.on('data', (chunk) => { raw += chunk; });
		req.on('end', () => {
			try {
				const json = raw ? JSON.parse(raw) : {};
				resolve(json);
			} catch (e) {
				reject(new Error('Invalid JSON body'));
			}
		});
		req.on('error', (e) => reject(e));
	});
}

function killChildTree(child, signal = 'SIGTERM') {
	return new Promise((resolve) => {
		if (!child) return resolve();
		const isWin = process.platform === 'win32';
		try {
			if (!isWin && child.pid) {
				process.kill(-child.pid, signal);
			} else {
				child.kill(signal);
			}
		} catch {}
		const t = setTimeout(() => {
			try {
				if (!isWin && child.pid) {
					process.kill(-child.pid, 'SIGKILL');
				} else {
					child.kill('SIGKILL');
				}
			} catch {}
			resolve();
		}, 1500);
		child.once('exit', () => { clearTimeout(t); resolve(); });
		child.once('close', () => { clearTimeout(t); resolve(); });
	});
}

async function handleRender(req, res) {
	if (isBusy) {
		return sendJson(res, 409, { ok: false, error: 'busy', message: 'Another render is in progress. Try again later.' });
	}
	let payload;
	try {
		payload = await parseJsonBody(req);
	} catch (e) {
		return sendJson(res, 400, { ok: false, error: 'bad_request', message: e.message });
	}
	const listingId = Number(payload?.listingId ?? payload?.id ?? payload?.listing_id);
	const variant = String(payload?.variant || 'bireysel');
	if (!Number.isFinite(listingId) || listingId <= 0) {
		return sendJson(res, 400, { ok: false, error: 'validation', message: 'listingId (positive number) is required' });
	}

	isBusy = true;
	let responded = false;
	const args = [path.join('scripts', 'pipeline.mjs'), String(listingId), variant];
	const child = spawn(process.execPath, args, {
		cwd: projectRoot,
		env: { ...process.env, ENABLE_PREVIEW: '0' },
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	currentChild = child;

	// Cancel job if client disconnects
	req.on('close', async () => {
		if (!responded && currentChild === child) {
			await killChildTree(child);
			isBusy = false;
			currentChild = null;
			if (currentTimer) { clearTimeout(currentTimer); currentTimer = null; }
		}
	});

	// Timeout watchdog
	currentTimer = setTimeout(async () => {
		if (currentChild === child) {
			await killChildTree(child);
			isBusy = false;
			currentChild = null;
			currentTimer = null;
			if (!responded) {
				responded = true;
				return sendJson(res, 504, { ok: false, error: 'timeout', message: 'Render timed out' });
			}
		}
	}, MAX_JOB_MS);

	let logs = '';
	let outputPath = null;
	let s3Url = null;
	child.stdout.setEncoding('utf8');
	child.stdout.on('data', (chunk) => {
		logs += chunk;
		const lines = String(chunk).split(/\r?\n/);
		for (const line of lines) {
			const m = line.match(/^::OUTPUT::(.+)$/);
			if (m) {
				outputPath = m[1].trim();
			}
			const m2 = line.match(/^::S3_URL::(.+)$/);
			if (m2) {
				s3Url = m2[1].trim();
			}
		}
	});
	child.stderr.setEncoding('utf8');
	child.stderr.on('data', (chunk) => { logs += chunk; });

	child.on('close', (code) => {
		if (currentTimer) { clearTimeout(currentTimer); currentTimer = null; }
		if (currentChild === child) currentChild = null;
		isBusy = false;
		if (!responded) {
			responded = true;
			if (code === 0) {
				return sendJson(res, 200, { ok: true, output: outputPath, s3Url, listingId, variant });
			}
			return sendJson(res, 500, { ok: false, error: 'pipeline_failed', code, logs });
		}
	});
	child.on('error', (err) => {
		if (currentTimer) { clearTimeout(currentTimer); currentTimer = null; }
		if (currentChild === child) currentChild = null;
		isBusy = false;
		if (!responded) {
			responded = true;
			return sendJson(res, 500, { ok: false, error: 'spawn_error', message: err?.message || String(err) });
		}
	});
}

async function handleCancel(_req, res) {
	if (!isBusy || !currentChild) {
		return sendJson(res, 200, { ok: true, cancelled: false, message: 'No active job' });
	}
	await killChildTree(currentChild);
	if (currentTimer) { clearTimeout(currentTimer); currentTimer = null; }
	currentChild = null;
	isBusy = false;
	return sendJson(res, 200, { ok: true, cancelled: true });
}

const server = createServer((req, res) => {
	// Basic CORS (optional for local testing)
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	if (req.method === 'OPTIONS') {
		res.statusCode = 204;
		return res.end();
	}

	if (req.method === 'GET' && req.url === '/health') {
		return sendJson(res, 200, { ok: true });
	}
	if (req.method === 'POST' && req.url === '/api/render') {
		return handleRender(req, res);
	}
	if (req.method === 'POST' && req.url === '/api/cancel') {
		return handleCancel(req, res);
	}

	sendJson(res, 404, { ok: false, error: 'not_found' });
});

server.timeout = 0; // Disable request timeout for long renders
server.headersTimeout = 0;
server.keepAliveTimeout = 0;

server.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`API server listening on http://localhost:${PORT}`);
});
