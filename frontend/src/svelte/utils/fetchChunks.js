const CACHE_PREFIX = 'onnx-model-cache';
const CACHE_NAME = `${CACHE_PREFIX}-v2`;

// Fetch a batch of URLs concurrently
async function fetchBatch(urls, cache) {
	return Promise.all(
		urls.map(({ url, index }) =>
			fetch(url).then((response) => {
				if (response.ok) {
					cache.put(url, response.clone());
					return { index, buffer: response.arrayBuffer() };
				} else {
					throw new Error(`Failed to fetch ${url}`);
				}
			})
		)
	);
}

async function fetchModelChunks(chunkUrls) {
	await clearOldCaches();

	let hasCache = false;
	const cache = await caches.open(CACHE_NAME);
	const cachedResponses = await Promise.all(chunkUrls.map((url) => cache.match(url)));

	const modelBuffers = new Array(chunkUrls.length);
	const uncached = [];

	// Separate cached vs uncached
	for (let i = 0; i < chunkUrls.length; i++) {
		if (cachedResponses[i]) {
			hasCache = true;
			modelBuffers[i] = await cachedResponses[i].arrayBuffer();
		} else {
			uncached.push({ url: chunkUrls[i], index: i });
		}
	}

	// Fetch uncached chunks in batches of 6 to avoid overwhelming the browser
	const BATCH_SIZE = 6;
	for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
		const batch = uncached.slice(i, i + BATCH_SIZE);
		const results = await fetchBatch(batch, cache);
		for (const { index, buffer } of results) {
			modelBuffers[index] = await buffer;
		}
	}

	return { hasCache, modelBuffers };
}

export async function fetchAndMergeChunks(urls) {
	const { hasCache, modelBuffers: chunks } = await fetchModelChunks(urls);
	const totalSize = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
	const mergedArray = new Uint8Array(totalSize);
	let offset = 0;
	for (const chunk of chunks) {
		mergedArray.set(new Uint8Array(chunk), offset);
		offset += chunk.byteLength;
	}
	return { hasCache, mergedArray: mergedArray.buffer };
}

async function clearOldCaches() {
	const cacheNames = await caches.keys();
	await Promise.all(
		cacheNames.map((name) => {
			if (name !== CACHE_NAME && name.includes(CACHE_PREFIX)) {
				console.log(`Deleting old cache: ${name}`);
				return caches.delete(name);
			}
		})
	);
}
