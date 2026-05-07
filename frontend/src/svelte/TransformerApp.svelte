<!--
  TransformerApp.svelte
  Merged root component — replaces SvelteKit's +layout.svelte and +page.svelte.
  Removes all SvelteKit-specific imports ($app/paths, $app/stores, <slot/>).
-->
<script lang="ts">
	// ─── Layout imports (from +layout.svelte) ───────────────────
	import '~/styles/app.css';
	import '~/styles/global.scss';
	import Topbar from '~/components/Topbar.svelte';
	import { isLoaded, predictedColor, rootRem, userId } from '~/store';
	import Article from '~/components/article/Article.svelte';

	// ─── Page imports (from +page.svelte) ───────────────────────
	import {
		tokens,
		expandedBlock,
		vectorHeight,
		inputText,
		sampling,
		maxVectorHeight,
		minVectorHeight,
		maxVectorScale,
		headContentHeight,
		temperature,
		modelData,
		modelSession,
		isFetchingModel,
		selectedExampleIdx,
		isMobile,
		isOnBlockTransition,
		blockIdx,
		isTextbookOpen
	} from '~/store';
	import { PreTrainedTokenizer } from '@xenova/transformers';
	import Sankey from '~/components/Sankey.svelte';
	import Attention from '~/components/Attention.svelte';
	import SubsequentBlocks from '~/components/SubsequentBlocks.svelte';
	import LinearSoftmax from '~/components/LinearSoftmax.svelte';
	import Embedding from '~/components/Embedding.svelte';
	import Mlp from '~/components/Mlp.svelte';

	import { onMount } from 'svelte';
	import classNames from 'classnames';
	import * as ort from 'onnxruntime-web';

	import { adjustTemperature, runModel, fakeRunWithCachedData } from '~/utils/data';
	import { fetchAndMergeChunks } from '~/utils/fetchChunks';
	import WeightPopovers from '~/components/WeightPopovers.svelte';
	import { fade } from 'svelte/transition';
	import { AutoTokenizer, env as xenovaEnv } from '@xenova/transformers';
	import { ex0, ex1, ex2, ex3, ex4 } from '~/constants/examples';
	import BlockTransition from '~/components/BlockTransition.svelte';
	import QKV from '~/components/QKV.svelte';
	import Textbook from '~/components/textbook/Textbook.svelte';

	ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.0/dist/';
	ort.env.logLevel = 'error';

	// Force @xenova/transformers to use remote HuggingFace CDN only.
	// Vite pre-bundling breaks its Node-vs-browser detection, causing it to
	// try local file paths which Vite serves as index.html (HTML instead of JSON).
	xenovaEnv.allowLocalModels = false;
	xenovaEnv.useBrowserCache = false;
	xenovaEnv.remoteHost = 'https://huggingface.co/';
	xenovaEnv.remotePathTemplate = '{model}/resolve/{revision}/';

	// ─── Layout state ───────────────────────────────────────────
	let topBarHeight = 0;
	let scrollLeft = 0;
	let minScreenWidth = 1300;
	let minColumWidth = Math.floor(minScreenWidth / 24) - rootRem * 2;
	let intersectionObserver: IntersectionObserver;
	let tobBarActive = false;
	let target: HTMLElement;

	// ─── Page state ─────────────────────────────────────────────
	let active = false;
	let appStartTime = Date.now();
	let vizHeight = 0;
	let titleHeight = rootRem * 5;

	// ─── Mount (replaces both layout and page onMount) ──────────
	onMount(() => {
		// Layout: mark loaded, read userId from URL
		isLoaded.set(true);
		const userIdParam = new URL(window.location.href).searchParams.get('userId');
		if (userIdParam) {
			userId.set(userIdParam);
			(window as any).dataLayer?.push({
				event: 'user_identified',
				user_id: userIdParam,
				timestamp: new Date().toISOString()
			});
		}

		// Layout: intersection observer for topbar
		intersectionObserver = new IntersectionObserver(handleIntersection, {
			root: null,
			rootMargin: '0px',
			threshold: 0.2
		});
		if (target) {
			intersectionObserver.observe(target);
		}
		window.addEventListener('scroll', handleMobileScrollX);

		// Page: init tokenizer and model
		const initPage = async () => {
			const gpt2Tokenizer = await AutoTokenizer.from_pretrained('NlpHUST/gpt2-vietnamese', {
				local_files_only: false,
			});
			active = true;
			const unsubscribe = subscribeInputs(gpt2Tokenizer);
			if (!$isMobile) {
				await fetchModel();
			}
			return unsubscribe;
		};

		let pageCleanup: (() => void) | undefined;
		initPage().then((unsub) => {
			pageCleanup = unsub;
		});

		return () => {
			intersectionObserver.disconnect();
			window.removeEventListener('scroll', handleMobileScrollX);
			pageCleanup?.();
		};
	});

	// ─── Layout helpers ─────────────────────────────────────────
	function handleIntersection(entries: any[]) {
		entries.forEach((entry: any) => {
			tobBarActive = entry.isIntersecting;
		});
	}
	const handleMobileScrollX = () => {
		scrollLeft = window.scrollX || document.documentElement.scrollLeft;
	};

	// ─── Page: fetch model (base path replaced: $app/paths → '/') ─
	const fetchModel = async () => {
		const chunkNum = 53;
		const chunkUrls = Array(chunkNum)
			.fill(0)
			.map((_, i) => `/model-v2/gpt2.onnx.part${i}`);

		const { hasCache, mergedArray } = await fetchAndMergeChunks(chunkUrls);
		const blob = new Blob([mergedArray], { type: 'application/octet-stream' });
		const url = URL.createObjectURL(blob);
		const session = await ort.InferenceSession.create(url);

		modelSession.set(session);
		isFetchingModel.set(false);

		const loadTime = Date.now() - appStartTime;
		(window as any).dataLayer?.push({
			event: 'model-loaded',
			use_cache: hasCache,
			load_time_ms: loadTime,
			user_id: $userId
		});
	};

	// ─── Page: subscribe to input changes ───────────────────────
	const cachedDataMap = [ex0, ex1, ex2, ex3, ex4];
	const subscribeInputs = (tokenizer: PreTrainedTokenizer) => {
		const runModelOrCache = () => {
			if ($isFetchingModel || !$modelSession) {
				const cachedData = cachedDataMap[$selectedExampleIdx];
				fakeRunWithCachedData({
					cachedData,
					tokenizer,
					temperature: $temperature,
					sampling: $sampling
				});
				return;
			}
			runModel({
				tokenizer,
				input: $inputText.trim(),
				temperature: $temperature,
				sampling: $sampling
			});
		};

		const unsubscribeInputText = inputText.subscribe(() => {
			runModelOrCache();
		});

		let initialTemperature = true;
		const unsubscribeTemperature = temperature.subscribe((value) => {
			if (initialTemperature) { initialTemperature = false; return; }
			adjustTemperature({
				tokenizer,
				logits: $modelData.logits,
				temperature: value,
				sampling: $sampling
			});
		});

		let initialSampling = true;
		const unsubscribeSampling = sampling.subscribe((value) => {
			if (initialSampling) { initialSampling = false; return; }
			adjustTemperature({
				tokenizer,
				logits: $modelData.logits,
				temperature: $temperature,
				sampling: value
			});
		});

		return () => {
			unsubscribeInputText();
			unsubscribeTemperature();
			unsubscribeSampling();
		};
	};

	// ─── Page: vector height calculation ────────────────────────
	const calculateVectorHeight = () => {
		const gaps = rootRem * 0.5 * ($tokens.length - 1);
		const vectorHeightVal = Math.min(
			Math.max((vizHeight - titleHeight - gaps) / $tokens.length / maxVectorScale, minVectorHeight),
			maxVectorHeight
		);
		vectorHeight.set(vectorHeightVal);
		headContentHeight.set(Math.max($tokens.length * vectorHeightVal * 3 + gaps, rootRem * 20));
	};

	$: if (vizHeight || $tokens.length) {
		calculateVectorHeight();
	}
</script>

<!-- ═══ Layout ═══ -->
<div
	id="app"
	style={`--min-screen-width:${minScreenWidth}px;--min-column-width:${minColumWidth}px;--predicted-color:${predictedColor};`}
>
	<div id="landing">
		<header bind:offsetHeight={topBarHeight} style="transform: translateX({-1 * scrollLeft}px);">
			<Topbar isActive={tobBarActive} />
		</header>
		<main id="main" style={`padding-top:${topBarHeight}px`} bind:this={target}>
			{#if $isLoaded}
				<!-- ═══ Page content (inline, no <slot/>) ═══ -->
				<div
					class:active
					class="main-section h-full w-full"
					style={`--vector-height: ${$vectorHeight}px;--title-height: ${titleHeight}px;--content-height:${vizHeight - titleHeight}px;`}
				>
					{#if !!$expandedBlock.id}
						<div class={classNames('dim', `${$expandedBlock.id || ''}`)} transition:fade={{ duration: 100 }}></div>
						<div class={classNames('dim-partial left', `${$expandedBlock.id || ''}`)} transition:fade={{ duration: 100 }}></div>
						<div class={classNames('dim-partial right', `${$expandedBlock.id || ''}`)} transition:fade={{ duration: 100 }}></div>
					{/if}
					<div class="sankey opacity-1" class:attention={$expandedBlock.id === 'attention'}>
						<Sankey />
					</div>
					<div class="nodes resize-watch">
						<div class="steps" class:expanded={!!$expandedBlock.id} bind:offsetHeight={vizHeight}>
							<Embedding className="step" />
							<div class="blocks relative">
								<div class="block-steps main" class:initial={$blockIdx === 0}>
									<QKV className="step" />
									<Attention className="step" />
									<Mlp className="step" />
								</div>
								<div class="block-steps next" class:hide={!$isOnBlockTransition} class:initial={$blockIdx === 0}>
									<QKV className="step" />
									<Attention className="step" />
									<Mlp className="step" />
								</div>
								<div class="transition-watch" class:hide={!$isOnBlockTransition}></div>
							</div>
							<SubsequentBlocks className="step" />
							<LinearSoftmax className="step" />
						</div>
						<WeightPopovers />
						<BlockTransition />
						{#if !$isMobile}
							<Textbook showTextCard={$isTextbookOpen} />
						{/if}
					</div>
				</div>
			{:else}
				<div class="flex h-full w-full items-center justify-center">
					<div class="spinner"></div>
				</div>
			{/if}
		</main>
	</div>
	<div class="article h-auto w-full">
		<Article />
	</div>
</div>

<style lang="scss">
	/* ─── Spinner (replaces flowbite-svelte Spinner) ─── */
	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid #e5e7eb;
		border-top-color: #8b5cf6;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	/* ─── Layout styles ─── */
	#app {
		height: 100vh;
		min-width: 900px;
	}
	#landing {
		height: 100%;
		width: 100%;
		min-width: var(--min-screen-width);
	}
	header {
		min-width: var(--min-screen-width);
		width: 100%;
		position: fixed;
		z-index: $TOP_BAR_INDEX;
	}
	main {
		position: relative;
		height: 95%;
		width: 100%;
		display: flex;
		justify-content: start;
		overflow: hidden;
	}
	.article {
		padding-top: 2rem;
	}

	/* ─── Page styles ─── */
	.main-section {
		opacity: 0;
		&.active { opacity: 1; }
	}
	.nodes {
		height: 100%;
		width: 100%;
		padding: 1rem 0 3rem 0;
		position: relative;
	}
	.steps {
		position: relative;
		width: 100%;
		height: 100%;
		display: grid;
		grid-template-columns: auto 3.5fr 0.5fr 0.5fr;

		&.expanded {
			:global(.step > .title) { padding-bottom: 3rem; }
		}

		.blocks {
			position: relative;
			width: 100%;
			height: 100%;

			.block-steps {
				height: 100%;
				width: 100%;
				position: absolute;
				display: grid;
				grid-template-columns: 0.5fr 2fr 1fr;
			}
			.block-steps.main { transform-origin: 3rem center; top: 0; left: 0; }
			.block-steps.next { transform-origin: right center; justify-content: end; top: 0; right: 0; pointer-events: none; }
			.transition-watch { position: absolute; top: 0; left: 0; height: 100%; width: 100%; pointer-events: none; }
			.hide { display: none; }

			&.animate-forward {
				.block-steps, .transition-watch { animation-duration: 800ms; animation-timing-function: ease-in; }
				.block-steps.main { animation-name: collapse; &.initial { transform-origin: left center; } }
				.block-steps.next { animation-name: expand; }
				.transition-watch { animation-name: width-collapse; }
			}
			&.animate-backward {
				.block-steps, .transition-watch { animation-duration: 800ms; animation-timing-function: ease-in; }
				.block-steps.main { animation-name: expand; &.initial { transform-origin: left center; } }
				.block-steps.next { animation-name: collapse; }
				.transition-watch { animation-name: width-collapse; }
			}
		}
	}

	@keyframes width-collapse { 0% { width: 100%; } 100% { width: 0%; } }
	@keyframes expand { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }
	@keyframes collapse { 0% { transform: scaleX(1); } 100% { transform: scaleX(0); } }

	:global(.step) { height: 100%; display: grid; grid-template-rows: var(--title-height) 1fr; }
	:global(.step > .title) {
		z-index: $COLUMN_TITLE_INDEX; display: flex; flex-direction: column; justify-content: end;
		grid-row: 1; color: var(--color-gray-400); white-space: nowrap; padding-bottom: 2rem;
		overflow: visible; min-width: 0; transition: all 0.5s; cursor: default;
		&:hover { color: var(--color-gray-600); }
	}
	:global(.step > .title.expandable) { cursor: pointer; }
	:global(.step .content) { grid-row: 2; height: fit-content; }
	:global(.column) {
		display: flex; flex-direction: column; gap: 0.5rem; position: relative;
		:global(.cell) { height: var(--vector-height); display: flex; gap: 1rem; align-items: center; position: relative; }
		:global(.subtitle) { position: absolute; top: 0; transform: translateY(calc(-100% - 1rem)); text-align: center; font-size: 0.8rem; color: var(--color-gray-400); width: 100%; z-index: $COLUMN_TITLE_INDEX; }
	}
	:global(.vector), :global(.sub-vector) { position: relative; z-index: $VECTOR_INDEX; width: 12px; height: var(--vector-height); flex-shrink: 0; justify-content: start; }
	:global(.cell.x1-12), :global(.vector.x1-12), :global(.sub-vector.x1-12) { height: calc(var(--vector-height) / 12); }
	:global(.cell.x3), :global(.vector.x3), :global(.sub-vector.x3) { height: calc(var(--vector-height) * 3); }
	:global(.cell.x4), :global(.vector.x4), :global(.sub-vector.x4) { height: calc(var(--vector-height) * 3.1); }
	:global(.vector.vocab), :global(.sub-vector.vocab) { height: 100%; width: 0; }
	:global(.sub-vector.head-rest) { flex: 1 0 0; }
	:global(.label) { font-size: 0.9rem; color: var(--color-gray-700); z-index: $VECTOR_INDEX; display: inline; max-width: 7rem; overflow: hidden; text-overflow: ellipsis; text-align: right; line-height: var(--vector-height); height: var(--vector-height); flex-shrink: 0; }
	:global(.label.float) { position: absolute; left: -0.8rem; transform: translateX(-100%); }
	:global(.label.float-right) { position: absolute; left: -0.8rem; }
	:global(.ellipsis) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	:global(.bounding) { position: absolute; box-sizing: content-box; top: -0.5rem; padding: 0.5rem 0; left: 0; height: 100%; border: 2px dashed var(--color-gray-300); border-radius: 0.5rem; transition: opacity 0.5s; opacity: 0; pointer-events: none; }
	:global(.bounding.active) { opacity: 0.8; }
	:global(.popover) { z-index: $POPOVER_INDEX; width: max-content; }
	:global(.tooltip) { z-index: $TOOLTIP_INDEX; background-color: white !important; color: var(--color-gray-600) !important; border: 1px solid var(--color-gray-200) !important; padding: 0.2rem 0.5rem !important; font-size: 0.8rem !important; white-space: nowrap; font-weight: 300 !important; border-color: var(--color-gray-200) !important; }

	.dim {
		position: absolute; top: 0; left: 0; width: 100%; height: 100%;
		z-index: $DIM_INDEX; background-color: white; opacity: 0.7; user-select: none;
		&.attention { z-index: 0; }
	}
	.dim-partial {
		user-select: none; z-index: $PARTIAL_DIM_INDEX; position: absolute; top: 0; height: 100%;
		&.right { right: 0; background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 80%); }
		&.left { left: 0; background: linear-gradient(-90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 80%); }
		&.embedding { &.left { display: none; } &.right { width: 60%; } }
		&.attention { &.left { width: 20%; } &.right { width: 20%; } }
		&.softmax { &.left { width: 60%; } &.right { display: none; } }
	}
	.sankey {
		position: absolute; left: 0; top: 0; width: 100%; height: 100%;
		&.attention {
			:global(.sankey-top) { z-index: $EXPANDED_ATTENTION_INDEX !important; pointer-events: none; }
		}
	}
	:global(svg g.path-group) { transition: opacity 0.5s; }
	:global(div.step > div) { transition: opacity 0.5s; }
	:global(div.step .column) { transition: opacity 0.5s; }
</style>
