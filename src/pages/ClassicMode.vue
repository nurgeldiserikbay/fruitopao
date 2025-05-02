<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import gsap from 'gsap'

import UiButton from '@/components/UiButton.vue'
import BackLink from '@/components/BackLink.vue'
import TimerItem from '@/components/TimerItem.vue'
import ResultTable from '@/components/ResultTable.vue'

import { usePageStore } from '@/store/pageStore'
import { useAdsStore } from '@/store/adsStore'

import Admob from '@/utils/admob'
import { ICoord, ITile, TYPE_GRID, TYPE_PATH } from '@/utils/types'
import { useAudio } from '@/composables/useAudio'

import {
	generateBoard,
	isTruePair,
	modifyTable,
	noMoves,
	shuffleTable,
} from './game'

const pageStore = usePageStore()
const adsStore = useAdsStore()
const audioCont = useAudio()

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

const tilesRefs = ref()
const shuffleCount = ref(5)
const freeCoords = ref<ICoord[]>([])
const tiles = shallowRef<TYPE_GRID>([])
const selectedPoint = ref<ICoord>()
const secondPoint = ref<ICoord>()
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

	generateTable()

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
	clearTimers()
	if (Capacitor.getPlatform() === 'android') {
		Admob.removeBanner()
	}
})

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
	if (Capacitor.getPlatform() === 'android') {
		if (adsStore.loading) return
		adsStore.toggleLoading(true)
		Admob.interstitial({
			isFirst: false,
			onInterstitialAdClosed: () => {
				adsStore.toggleLoading(false)
				next()
			},
		})
	} else {
		next()
	}
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
		isEnd.value = true
	} else {
		tiles.value = [...tilesGrid]
	}
}

function clearTiles() {
	if (!selectedPoint.value || !secondPoint.value) return

	audioCont.playAudio('remove')
	tiles.value[selectedPoint.value.row][selectedPoint.value.col] = null
	tiles.value[secondPoint.value.row][secondPoint.value.col] = null
	score.value += 20
	freeCoords.value.push(selectedPoint.value)
	freeCoords.value.push(secondPoint.value)
	const emptyPoint: TYPE_PATH = [
		[selectedPoint.value.row, selectedPoint.value.col],
		[secondPoint.value.row, secondPoint.value.col],
	]
	selectedPoint.value = undefined
	secondPoint.value = undefined

	if (freeCoords.value.length === cols * rows) {
		isWin.value = true
		isEnd.value = true

		return
	}

	timers['0'] = setTimeout(() => {
		runShuffle(morphTable(emptyPoint))
		delete timers['0']
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
	isEnd.value = true
}

function clearTimers() {
	Object.values(timers).forEach((id) => clearTimeout(id))
}
</script>

<template>
	<div class="page">
		<div class="page__head">
			<BackLink />
			<TimerItem
				class="time"
				:is-win="isWin"
				:level="level"
				@addtimescore="addtimescore"
				@timeend="timeend"
			/>
			<div class="page__info">
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
.page {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	padding: 15px 15px 85px;

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
	background-color: rgba(255, 255, 255, 0.1);
	backdrop-filter: blur(3px);
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

		&:after {
			content: '';
			position: absolute;
			top: 0;
			left: 0;
			bottom: 0;
			right: 0;
			z-index: 1;
			background: #bff75f75;
			opacity: 0;
			transition: 0.2s linear;
		}

		&--active {
			z-index: 10;
			opacity: 0.8;

			&:after {
				opacity: 1;
			}
		}
	}
}
</style>
