import { useMemo, useState } from 'react';
import './App.css';

function App() {
	const [text, setText] = useState('');
	const [resultType, setResultType] = useState('multiple');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [results, setResults] = useState(null);

	// Derive API base (works on Vercel and local dev)
		const apiUrl = useMemo(() => {
			// On Vercel, the function will be served from /api/paraph
			// In local dev, call the Vercel dev server (default :3000) directly to avoid proxy config
			if (import.meta.env.DEV) {
				return `${window.location.protocol}//${window.location.hostname}:3000/api/paraph`;
			}
			return '/api/paraph';
		}, []);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');
		setResults(null);
		const trimmed = text.trim();
		if (!trimmed) {
			setError('Please enter some text to paraphrase.');
			return;
		}
		setLoading(true);
		try {
			const res = await fetch(apiUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: trimmed, resultType })
			});
			const data = await res.json().catch(() => null);
			if (!res.ok) {
				throw new Error(data?.error || `Request failed (${res.status})`);
			}
			// data.data could be array-of-arrays (multiple) or array (single) or string
			setResults(data?.data ?? null);
		} catch (err) {
			setError(err?.message || 'Something went wrong');
		} finally {
			setLoading(false);
		}
	};

	const renderResults = () => {
		if (!results) return null;

		// Normalize into an array of groups, where each group is an array of strings
		let groups = [];
		if (Array.isArray(results)) {
			if (results.every(item => Array.isArray(item))) {
				groups = results; // already array of arrays
			} else if (results.every(item => typeof item === 'string')) {
				groups = [results]; // a single group of strings
			} else {
				groups = [[JSON.stringify(results)]];
			}
		} else if (typeof results === 'string') {
			groups = [[results]];
		} else {
			groups = [[JSON.stringify(results)]];
		}

		return (
			<div className="results" aria-live="polite">
				{groups.map((group, i) => (
					<div className="result-group" key={i}>
						{group.map((variant, j) => (
							<div className="result-card" key={j}>
								<p>{variant}</p>
								<button
									type="button"
									className="copy-btn"
									onClick={() => navigator.clipboard.writeText(variant)}
									aria-label="Copy paraphrased text"
								>
									Copy
								</button>
							</div>
						))}
					</div>
				))}
			</div>
		);
	};

	return (
		<div className="app">
			<header className="header">
				<h1>Paraphrase Genius</h1>
				<p className="tagline">Quickly rephrase your text with multiple alternatives.</p>
			</header>

			<main>
				<form className="form" onSubmit={handleSubmit}>
					<label htmlFor="text" className="label">Enter text</label>
					<textarea
						id="text"
						className="textarea"
						placeholder="Paste or type your text here..."
						value={text}
						onChange={(e) => setText(e.target.value)}
						rows={10}
					/>

					<div className="controls">
						<div className="select-wrap">
							<label htmlFor="resultType" className="sublabel">Result type</label>
							<select
								id="resultType"
								className="select"
								value={resultType}
								onChange={(e) => setResultType(e.target.value)}
							>
								<option value="multiple">Multiple (per sentence)</option>
								<option value="single">Single</option>
							</select>
						</div>
						<button className="submit" type="submit" disabled={loading}>
							{loading ? 'Paraphrasing…' : 'Paraphrase'}
						</button>
					</div>

					{error && <div className="error" role="alert">{error}</div>}
				</form>

				{renderResults()}
			</main>

			<footer className="footer">
				<small>
					Created by Nicolás Vergara using vite, vercel, nodejs, and react. 2025
				</small>
			</footer>
		</div>
	);
}

export default App;

