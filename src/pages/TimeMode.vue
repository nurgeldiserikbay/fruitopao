<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, computed } from 'vue'
import gsap from 'gsap'
import { Capacitor } from '@capacitor/core'

import UiButton from '@/components/UiButton.vue'
import BackLink from '@/components/BackLink.vue'
import TimerItem from '@/components/TimerItem.vue'
import ResultTable from '@/components/ResultTable.vue'
import TileEffects from '@/components/TileEffects.vue'

import { usePageStore } from '@/store/pageStore'
import { useScoreStore } from '@/store/scoreStore'
import { useAudio } from '@/composables/useAudio'
import { useTileEffects } from '@/composables/useTileEffects'
import Admob from '@/utils/admob'
import { ICoord, ITile, TYPE_GRID, TYPE_PATH } from '@/utils/types'

import {
	generateBoard,
	isTruePair,
	modifyTable,
	noMoves,
	randomInt,
	shuffleTable,
} from './game'
import { TYPE, PAGES } from '@/utils/conts'

const pageStore = usePageStore()
const scoreStore = useScoreStore()
const audioCont = useAudio()
const { effects, sparkle, score: popScore } = useTileEffects()

const cols = 16
const rows = 8
const width = 100 / (cols + 2)
const height = 100 / (rows + 2)

let timers: { [key: number]: ReturnType<typeof setTimeout> } = {}
const score = ref(0)
const level = ref(0)
const isEnd = ref(false)
const isWin = ref<boolean>(false)
const isAnimate = ref(false)
let animOrders: (() => void)[] = []
const tilesRefs = ref()
const shuffleCount = ref(5)
const freeCoords = ref<ICoord[]>([])
const tiles = shallowRef<TYPE_GRID>([])
const selectedPoint = ref<ICoord>()
const secondPoint = ref<ICoord>()
const failPoint = ref<ICoord>()
const seededKeys = ref<number[]>([])

// Отсчёт до подсева. Раньше пары появлялись без предупреждения и читались как
// случайная помеха — кольцо показывает, что это часть правил режима.
const seedLeft = ref(100)
const seedSoon = ref(false)
let seedTicker: ReturnType<typeof setInterval> | undefined
const selectedTile = computed(() => {
	return (
		selectedPoint.value &&
		tiles.value[selectedPoint.value.row][selectedPoint.value.col]
	)
})

const getStyle = computed(() => (row: number, col: number, tile?: ITile) => {
	return {
		width: `${width}%`,
		height: `${height}%`,
		transform: `translate(${col * 100}%, ${row * 100}%)`,
		transformOrigin: 'center',
		backgroundImage: tile ? `url('/img/fruits/${tile.type}.png')` : '',
	}
})

onMounted(async () => {
	audioCont.play('gameMusic')
	document.addEventListener('visibilitychange', handleVisibilityChange)

	generateTable()
	fillEmptyTiles()

	try {
		if (Capacitor.getPlatform() === 'android') {
			await Admob.showBanner()
		}
	} catch (error: any) {
		// console.log(error)
	}
})

onBeforeUnmount(() => {
	audioCont.stop('gameMusic')
	document.removeEventListener('visibilitychange', handleVisibilityChange)
	stopSeedCountdown()
	clearTimers()
	if (Capacitor.getPlatform() === 'android') {
		Admob.removeBanner()
	}
})

function handleVisibilityChange() {
	if (document.hidden) {
		audioCont.stop('gameMusic')
	} else {
		audioCont.play('gameMusic')
	}
}

function animEnd() {
	while (animOrders.length) {
		const func = animOrders.pop()
		if (func) func()
	}
}

function fillCoords() {
	if (freeCoords.value.length && !isEnd.value) {
		const firstPos = freeCoords.value.splice(
			randomInt(0, freeCoords.value.length - 1),
			1
		)[0]
		const secondPos = freeCoords.value.splice(
			randomInt(0, freeCoords.value.length - 1),
			1
		)[0]
		const type = randomInt(0, TYPE)
		const firstKey = new Date().getTime() + randomInt(0, 100000)
		const secondKey = firstKey + 1

		tiles.value = tiles.value.map((list, row) => {
			return list.map((item, col) => {
				if (firstPos.row === row && firstPos.col === col)
					return { key: firstKey, type }
				if (secondPos.row === row && secondPos.col === col)
					return { key: secondKey, type }
				return item
			})
		})

		// Метка для анимации появления: снимается, когда анимация отыграла.
		seededKeys.value = [firstKey, secondKey]
		clearTimeout(timers['4'])
		timers['4'] = setTimeout(() => {
			seededKeys.value = []
			delete timers['4']
		}, 300)
		runShuffle(
			morphTable([
				[firstPos.row, firstPos.col],
				[secondPos.row, secondPos.col],
			])
		)
		calcFreeCoords()
	}
	fillEmptyTiles()
}

function fillEmptyTiles() {
	const time = Math.max(
		5000,
		Math.round(35000 / Math.cbrt(freeCoords.value.length + 2))
	)

	startSeedCountdown(time)

	timers['2'] = setTimeout(() => {
		if (isAnimate.value) {
			animOrders.push(fillCoords)
			return
		}
		fillCoords()
	}, time)
}

function startSeedCountdown(duration: number) {
	const endAt = Date.now() + duration
	seedLeft.value = 100
	seedSoon.value = false

	if (seedTicker) clearInterval(seedTicker)
	seedTicker = setInterval(() => {
		const left = Math.max(0, endAt - Date.now())
		seedLeft.value = (left / duration) * 100
		seedSoon.value = left > 0 && left <= 1500
		if (left === 0) stopSeedCountdown()
	}, 100)
}

function stopSeedCountdown() {
	if (seedTicker) clearInterval(seedTicker)
	seedTicker = undefined
}

// Подсветка промаха держится ровно на длительность анимации.
function markFail(point: ICoord) {
	failPoint.value = point
	clearTimeout(timers['3'])
	timers['3'] = setTimeout(() => {
		failPoint.value = undefined
		delete timers['3']
	}, 200)
}

function addtimescore(scoreVal: number) {
	score.value += scoreVal
}

function next() {
	level.value += 1
	if (shuffleCount.value < 5) shuffleCount.value += 1
	isEnd.value = false
	isWin.value = false
	freeCoords.value = []
	generateTable()
}

function nextLevel() {
	// Никакой рекламы на этом пути: переход на следующий уровень запускает игрок.
	// Показ перенесён на завершение уровня.
	next()
}

function morphTable(emptyPoint: TYPE_PATH) {
	const curLevel = level.value % 10
	if (curLevel === 0) return tiles.value
	return modifyTable(curLevel, tiles.value, emptyPoint)
}

function hardShuffle() {
	audioCont.playAudio('shuffle')
	const tilesGrid = shuffleTable(tiles.value)
	shuffleCount.value = shuffleCount.value - 1
	runShuffle(tilesGrid, true)
}

function runShuffle(tilesGrid: TYPE_GRID, hard: boolean = false) {
	let isNotMove: boolean = false
	let suffled: boolean = false
	while ((isNotMove = noMoves(tilesGrid)) && shuffleCount.value > 0) {
		audioCont.playAudio('shuffle')
		tilesGrid = shuffleTable(tilesGrid)
		if (!suffled) suffled = true
	}
	if (suffled && !hard) shuffleCount.value = shuffleCount.value - 1
	if (isNotMove) {
		endRun()
	} else {
		tiles.value = [...tilesGrid]
	}
}

function calcFreeCoords() {
	const entries: ICoord[] = []
	tiles.value.forEach((row, ind) => {
		if (ind > 0 && ind <= rows) {
			row.forEach((col, colInd) => {
				if (colInd > 0 && colInd <= cols && col === null) {
					entries.push({
						row: ind,
						col: colInd,
					})
				}
			})
		}
	})
	freeCoords.value = entries
}

function clearTiles() {
	if (!selectedPoint.value || !secondPoint.value) return

	audioCont.playAudio('remove')
	sparkle(secondPoint.value.row, secondPoint.value.col)
	popScore(secondPoint.value.row, secondPoint.value.col, 20)
	tiles.value[selectedPoint.value.row][selectedPoint.value.col] = null
	tiles.value[secondPoint.value.row][secondPoint.value.col] = null
	score.value += 20
	const emptyPoint: TYPE_PATH = [
		[selectedPoint.value.row, selectedPoint.value.col],
		[secondPoint.value.row, secondPoint.value.col],
	]
	selectedPoint.value = undefined
	secondPoint.value = undefined
	const remaining = tiles.value.reduce(
		(acc, row) => acc + row.filter((tile) => tile !== null).length,
		0
	)
	if (remaining === 0) {
		isWin.value = true
		isEnd.value = true

		// Уровень пройден, экран итога уже показан — естественная пауза. Раньше
		// показ висел на кнопке перехода: объявление выходило в момент начала
		// следующего уровня, и сам уровень ждал его закрытия. Google называет это
		// недопустимым. Частоту ограничивает рекламный модуль.
		if (Capacitor.getPlatform() === 'android') {
			void Admob.interstitial()
		}

		return
	}

	timers['0'] = setTimeout(() => {
		runShuffle(morphTable(emptyPoint))
		delete timers['0']
		calcFreeCoords()
	}, 100)
}

function moveTileByCoords(
	tile: HTMLDivElement,
	coords: TYPE_PATH,
	onComplete: (...args: any[]) => void
) {
	if (!coords || coords.length === 0) {
		return
	}

	const timeline = gsap.timeline({
		onStart() {
			isAnimate.value = true
		},
		onComplete() {
			timers['1'] = setTimeout(() => {
				onComplete()
				animEnd()
				isAnimate.value = false
				delete timers['1']
			}, 500)
		},
	})

	coords.forEach((coord, coordInd) => {
		const [y, x] = coord
		const prevStep: [number, number] =
			coordInd === 0
				? [Number(selectedPoint.value?.row), Number(selectedPoint.value?.col)]
				: coords[coordInd - 1]
		const speed = Math.max(Math.abs(prevStep[0] - y), Math.abs(prevStep[1] - x))
		timeline.to(tile, {
			delay: 0.2,
			ease: 'none',
			duration: speed * 0.01,
			x: `${x * 100}%`,
			y: `${y * 100}%`,
		})
	})
}

async function tilePair(point: ICoord) {
	if (!selectedPoint.value) return

	const pathPair = isTruePair(tiles.value, selectedPoint.value, point)

	if (pathPair) {
		secondPoint.value = point
		const elem = tilesRefs.value.find(
			(el: HTMLDivElement) =>
				el.id === `${selectedPoint.value?.row}-${selectedPoint.value?.col}`
		)

		moveTileByCoords(elem, pathPair.slice(1), clearTiles)
	} else {
		audioCont.playAudio('fail')
		markFail(point)
		selectedPoint.value = undefined
	}
}

function clickTile(coord: ICoord) {
	if (isAnimate.value || isEnd.value) return
	if (!selectedPoint.value) {
		audioCont.playAudio('select')
		selectedPoint.value = coord
	} else {
		const secondTile = tiles.value[coord.row][coord.col]
		if (secondTile?.key === selectedTile.value?.key) return
		else if (selectedTile.value?.type !== secondTile?.type) {
			audioCont.playAudio('select')
			selectedPoint.value = coord
		} else if (selectedTile.value?.type === secondTile?.type) {
			tilePair(coord)
		}
	}
}

function generateTable() {
	// tiles.value = TestData
	tiles.value = generateBoard(cols, rows)
}

function timeend() {
	audioCont.playAudio('timeend')
	endRun()
}

// Рекорд пишем и по концу времени, и когда не осталось ходов.
function endRun() {
	isEnd.value = true
	stopSeedCountdown()
	scoreStore.submit(PAGES.TIME, score.value)
}

function clearTimers() {
	Object.values(timers).forEach((id) => clearTimeout(id))
}
</script>

<template>
	<div class="page">
		<div class="page__head">
			<BackLink />
			<div class="page__level">LEVEL {{ level + 1 }}</div>
			<TimerItem
				class="time"
				:is-win="isWin"
				:level="level"
				@addtimescore="addtimescore"
				@timeend="timeend"
			/>
			<div class="page__info">
				<div
					:class="{ 'page__seed--soon': seedSoon }"
					:style="{ '--seed': `${seedLeft}%` }"
					class="page__seed"
				></div>

				<div class="page__reload" @click="hardShuffle">
					<span>{{ shuffleCount }}</span>
					<button></button>
				</div>

				<div class="page__score">
					<img src="@/assets/img/star.png" alt="" />
					<span>{{ score }}</span>
				</div>
			</div>
		</div>

		<div class="tiles">
			<template v-for="(tileRow, row) in tiles" :key="row">
				<template v-for="(tile, col) in tileRow" :key="col">
					<div
						v-if="tile"
						ref="tilesRefs"
						:id="`${row}-${col}`"
						:style="{
							...getStyle(row, col, tile),
						}"
						:class="{
							'tile--active': tile?.key === selectedTile?.key,
							'tile--fail': failPoint?.row === row && failPoint?.col === col,
							'tile--seeded': !!tile && seededKeys.includes(tile.key),
						}"
						:row="row"
						:col="col"
						class="tile"
						@click="clickTile({ row, col })"
					></div>
					<div
						v-else
						ref="tilesRefs"
						:id="`${row}-${col}`"
						:style="getStyle(row, col)"
						class="tile"
					></div>
				</template>
			</template>

			<TileEffects
				:effects="effects"
				:cell-width="width"
				:cell-height="height"
			/>
		</div>

		<UiButton
			v-if="isEnd && isWin"
			class="page__next"
			@click="audioCont.playAudio('click'), nextLevel()"
		>
			Next
		</UiButton>

		<ResultTable
			v-if="isEnd && !isWin"
			:result="score"
			@close="audioCont.playAudio('click'), pageStore.toBackLink()"
		/>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/_redesign.scss';

.page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding: 15px 15px 85px;

	@include screen-bg(url('@/assets/redesign/backgrounds/game-calm.webp'));

	&__level {
		flex-shrink: 0;
		font-size: 18px;

		@include hud-pill;
	}

	// Кольцо отсчёта до подсева. Убывающий сектор режем маской: сам ассет
	// статичный, а conic-gradient даёт круговой отсчёт без лишней разметки.
	&__seed {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		background: url('@/assets/redesign/overlays/time-seed-ring.svg') center /
			contain no-repeat;
		mask-image: conic-gradient(#000 var(--seed, 100%), transparent 0);
		-webkit-mask-image: conic-gradient(#000 var(--seed, 100%), transparent 0);

		&--soon {
			animation: seed-pulse 0.75s ease-in-out;
		}
	}

	@keyframes seed-pulse {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.18);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		&__seed--soon {
			animation: none;
		}
	}

	// Таймер стоит между фиксированными плашками, поэтому забирает остаток
	// строки сам: собственная ширина 80% из TimerItem рядом с номером уровня
	// переполняла шапку.
	.time {
		flex: 1 1 auto;
		width: auto;
		min-width: 0;
	}

	&__head {
		position: relative;
		z-index: 300;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 15px;
		width: 100%;
		box-sizing: border-box;
		padding: 0 10px;
		margin-bottom: 10px;
	}

	&__info {
		width: 30%;
		padding: 2px 5px 2px 15px;
		box-sizing: border-box;
		flex-shrink: 0;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: 15px;
		color: #000;
		font-size: 22px;
		letter-spacing: 2px;
		background: rgba(255, 255, 255, 0.3);
		backdrop-filter: blur(3px);
		border-radius: 5px;
	}

	&__reload {
		display: flex;
		align-items: center;
		gap: 5px;

		button {
			width: 30px;
			height: 30px;
			border-radius: 8px;
			border: none;
			cursor: pointer;
			transition: 0.3s linear;
			background-size: cover;
			background-color: transparent;
			background-image: url('@/assets/img/reload.png');
		}
	}

	&__score {
		display: flex;
		align-items: center;
		gap: 5px;

		img {
			width: 20px;
			height: 20px;
			display: block;
		}
	}

	&__next {
		position: absolute;
		top: 50%;
		left: 50%;
		z-index: 100;
		transform: translate(-50%, -50%);
	}
}

.tiles {
	position: relative;
	width: 100%;
	aspect-ratio: 2;
	max-width: 100%;
	box-sizing: border-box;
	@include board-plate;

	transform: translateY(-35px);

	.tile {
		position: absolute;
		top: 0;
		left: 0;
		box-sizing: border-box;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		padding: 5px;
		transition: transform 0.2s linear, opacity 0.2s linear;
		background-size: 100% 100%;
		background-repeat: no-repeat;

		@include tile-overlay(url('@/assets/redesign/overlays/tile-selected.svg'));
		@include tile-fail;
		@include tile-seeded;
	}
}
</style>
