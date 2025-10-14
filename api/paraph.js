// Vercel Serverless Function for Paraphrase Genius (ESM)
// Uses RAPIDAPI_KEY from environment variables. Do NOT hardcode secrets.

const CORS_HEADERS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

function readRawBody(req) {
	return new Promise((resolve, reject) => {
		try {
			let data = "";
			req.on("data", (chunk) => {
				data += chunk;
			});
			req.on("end", () => resolve(data));
			req.on("error", reject);
		} catch (e) {
			reject(e);
		}
	});
}

export default async function handler(req, res) {
	// CORS preflight
	res.setHeader("Access-Control-Allow-Origin", CORS_HEADERS["Access-Control-Allow-Origin"]);
	res.setHeader("Access-Control-Allow-Methods", CORS_HEADERS["Access-Control-Allow-Methods"]);
	res.setHeader(
		"Access-Control-Allow-Headers",
		req.headers["access-control-request-headers"] || "Content-Type"
	);

	if (req.method === "OPTIONS") {
		res.status(200).end();
		return;
	}

	if (req.method !== "POST") {
		res.setHeader("Allow", "POST, OPTIONS");
		return res.status(405).json({ error: "Method Not Allowed" });
	}

	const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
	if (!RAPIDAPI_KEY) {
		return res.status(500).json({ error: "Missing RAPIDAPI_KEY environment variable" });
	}

	let payload = {};
	try {
		if (req.body && typeof req.body === "object") {
			payload = req.body;
		} else {
			const raw = await readRawBody(req);
			payload = raw ? JSON.parse(raw) : {};
		}
	} catch (e) {
		return res.status(400).json({ error: "Invalid JSON body" });
	}

	const { text, resultType = "multiple" } = payload;
	if (!text || typeof text !== "string" || !text.trim()) {
		return res.status(400).json({ error: "'text' is required in request body" });
	}

	const url = "https://paraphrase-genius.p.rapidapi.com/dev/paraphrase/";

	try {
		const upstream = await fetch(url, {
			method: "POST",
			headers: {
				"x-rapidapi-key": RAPIDAPI_KEY,
				"x-rapidapi-host": "paraphrase-genius.p.rapidapi.com",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				text,
				result_type: resultType === "single" ? "single" : "multiple",
			}),
		});

		const contentType = upstream.headers.get("content-type") || "";
		const data = contentType.includes("application/json")
			? await upstream.json()
			: await upstream.text();

		if (!upstream.ok) {
			return res.status(upstream.status).json({
				error: "Upstream API error",
				status: upstream.status,
				detail: data,
			});
		}

		// Return as-is; UI will render arrays/strings appropriately
		return res.status(200).json({ ok: true, data });
	} catch (err) {
		return res.status(500).json({ error: "Request failed", detail: err?.message || String(err) });
	}
}

