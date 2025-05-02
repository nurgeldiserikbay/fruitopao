import { TYPE } from '@/utils/conts'

import { ICoord, ITile, TYPE_GRID, TYPE_PATH, TYPE_ROW } from '@/utils/types'

export function generateBoard(cols: number, rows: number): TYPE_GRID {
	const totalTiles = cols * rows
	const pairs = Array.from({ length: totalTiles / 2 }, (_) =>
		randomInt(0, TYPE)
	)
		.flatMap((x) => [x, x])
		.sort(() => (Math.random() > 0.5 ? -1 : 1))

	const array: (ITile | null)[][] = []

	for (let i = 0; i < rows + 2; i += 1) {
		const row = []
		for (let j = 0; j < cols + 2; j += 1) {
			if (i > 0 && i < rows + 1 && j > 0 && j < cols + 1) {
				const index = (i - 1) * cols + (j - 1)
				row.push({
					key: index,
					type: pairs[index],
				})
			} else {
				row.push(null)
			}
		}
		array.push(row)
	}

	return array
}

export function isInBounds(
	board: TYPE_GRID,
	row: number,
	col: number
): boolean {
	return row >= 0 && row < board.length && col >= 0 && col < board[0].length
}

export function isClear(
	board: TYPE_GRID,
	row: number,
	col: number,
	end: { row: number; col: number }
): boolean {
	return (
		isInBounds(board, row, col) &&
		(board[row][col] === null || (row === end.row && col === end.col))
	)
}

export const directions = [
	[-1, 0],
	[1, 0],
	[0, -1],
	[0, 1],
]

export function simplifyPath(path: TYPE_PATH): TYPE_PATH {
	if (path.length <= 2) return path

	const simplified: TYPE_PATH = [path[0]]

	for (let i = 1; i < path.length - 1; i++) {
		const [prevRow, prevCol] = simplified[simplified.length - 1]
		const [curRow, curCol] = path[i]
		const [nextRow, nextCol] = path[i + 1]

		if (
			(prevRow === nextRow &&
				prevRow === curRow &&
				curCol >= Math.min(prevCol, nextCol) &&
				curCol <= Math.max(prevCol, nextCol)) ||
			(prevCol === nextCol &&
				prevCol === curCol &&
				curRow >= Math.min(prevRow, nextRow) &&
				curRow <= Math.max(prevRow, nextRow))
		) {
			continue
		}

		simplified.push([curRow, curCol])
	}

	simplified.push(path[path.length - 1])

	return optimizedPath(simplified)
}

export function bfs(
	board: TYPE_GRID,
	start: ICoord,
	end: ICoord
): TYPE_PATH | false {
	const queue: [number, number, TYPE_PATH, any, number][] = [
		[start.row, start.col, [], null, 0],
	]

	const visited = new Set()
	visited.add(`${start.row},${start.col}`)

	while (queue.length > 0) {
		// @ts-ignore
		const [curRow, curCol, path, lastDirection, turns] = queue.shift()

		if (curRow === end.row && curCol === end.col)
			return simplifyPath([[start.row, start.col], ...path])

		for (let i = 0; i < directions.length; i++) {
			const [dr, dc] = directions[i]
			let newRow = curRow
			let newCol = curCol
			let newPath = [...path]
			let newTurns = turns

			if (lastDirection !== null && lastDirection !== i) {
				newTurns += 1
			}

			if (newTurns > 2) continue

			while (isClear(board, newRow + dr, newCol + dc, end)) {
				newRow += dr
				newCol += dc

				if (visited.has(`${newRow},${newCol}`)) continue
				visited.add(`${newRow},${newCol}`)

				newPath.push([newRow, newCol])

				if (newRow === end.row && newCol === end.col) {
					return simplifyPath([[start.row, start.col], ...newPath])
				}

				queue.push([newRow, newCol, newPath, i, newTurns])
			}
		}
	}

	return false
}

export function optimizedPath(path: TYPE_PATH) {
	const optimized = [path[0]]

	for (let i = 1; i < path.length; i++) {
		const [prevRow, prevCol] = optimized[optimized.length - 1]
		const [curRow, curCol] = path[i]

		if (prevRow === curRow || prevCol === curCol) {
			optimized.push([curRow, curCol])
		} else {
			const [prev2Row, _] = optimized[optimized.length - 2]
			if (prev2Row === prevRow) {
				optimized[optimized.length - 1][1] = curCol
			} else {
				optimized[optimized.length - 1][0] = curRow
			}
			optimized.push([curRow, curCol])
		}
	}

	return optimized
}

export function isTruePair(
	board: TYPE_GRID,
	start: ICoord,
	end: ICoord
): TYPE_PATH | false {
	if (start.row === end.row && start.col === end.col) return false

	const path = bfs(board, start, end)

	return path || false
}

export function shuffleTable(board: TYPE_GRID): TYPE_GRID {
	let existItems = []
	const positions = []

	const rows = board.length
	const cols = board[0].length

	for (let r1 = 1; r1 < rows - 1; r1++) {
		for (let c1 = 1; c1 < cols - 1; c1++) {
			if (board[r1][c1] === null) continue
			existItems.push(board[r1][c1])
			positions.push([r1, c1])
		}
	}

	existItems = existItems.sort(() => (Math.random() > 0.5 ? -1 : 1))

	positions.forEach(([r, c]) => {
		const item = existItems.pop()

		if (item !== undefined) board[r][c] = item
	})

	return board
}

export function randomInt(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

export function modifyTable(
	level: number,
	table: TYPE_GRID,
	emptyPoint: TYPE_PATH
): TYPE_GRID {
	const rows = table.length
	const cols = table[0].length

	const centerCol = Math.floor(cols / 2)
	const centerRow = Math.floor(rows / 2)

	switch (level) {
		case 0:
			return table

		case 1:
			emptyPoint.forEach(([row, _]) => {
				const exist = table[row].filter((item) => item !== null)
				table[row] = [
					...new Array(cols - exist.length - 1).fill(null),
					...exist,
					null,
				]
			})
			return table

		case 2:
			emptyPoint.forEach(([row, _]) => {
				const exist = table[row].filter((item) => item !== null)
				table[row] = [
					null,
					...exist,
					...new Array(cols - exist.length - 1).fill(null),
				]
			})
			return table

		case 3:
			emptyPoint.forEach(([_, col], ind) => {
				if (
					emptyPoint.length - 1 === ind &&
					emptyPoint[0][1] === emptyPoint[1][1]
				)
					return
				const values: TYPE_ROW = []
				for (let i = 0; i < rows - 1; i += 1) {
					if (table[i][col]) values.push(table[i][col])
				}
				for (let i = 1; i < rows - 1; i += 1) {
					if (values[i - 1]) table[i][col] = values[i - 1]
					else table[i][col] = null
				}
			})
			return table

		case 4:
			emptyPoint.forEach(([_, col], ind) => {
				if (
					emptyPoint.length - 1 === ind &&
					emptyPoint[0][1] === emptyPoint[1][1]
				)
					return
				const values: TYPE_ROW = []
				for (let i = 0; i < rows - 1; i += 1) {
					if (table[i][col]) values.push(table[i][col])
				}
				for (let i = rows - 2; i > 0; i -= 1) {
					table[i][col] = values.pop() || null
				}
			})
			return table

		case 5:
			emptyPoint.forEach(([row, _]) => {
				let leftSlice = table[row].slice(0, centerCol).filter((e) => !!e)
				let rightSlice = table[row].slice(centerCol).filter((e) => !!e)

				table[row] = [
					null,
					...leftSlice,
					...new Array(cols - leftSlice.length - rightSlice.length - 2).fill(
						null
					),
					...rightSlice,
					null,
				]
			})
			return table

		case 6:
			emptyPoint.forEach(([row, col]) => {
				if (row >= centerRow) {
					const values = []
					for (let i = centerRow; i < rows - 1; i += 1) {
						if (table[i][col]) values.push(table[i][col])
					}
					for (let i = rows - 2; i >= centerRow; i -= 1) {
						table[i][col] = values.pop() || null
					}
				} else {
					const values: TYPE_ROW = []
					for (let i = 0; i < centerRow; i += 1) {
						if (table[i][col]) values.push(table[i][col])
					}
					for (let i = 1; i < centerRow; i += 1) {
						if (values[i - 1]) table[i][col] = values[i - 1]
						else table[i][col] = null
					}
				}
			})
			return table

		case 7:
			emptyPoint.forEach(([row, col]) => {
				if (col < centerCol) {
					const values = table[row].slice(0, centerCol).filter((i) => !!i)
					table[row] = [
						...new Array(centerCol - values.length).fill(null),
						...values,
						...table[row].slice(centerCol),
					]
				} else {
					const values = table[row].slice(centerCol).filter((i) => !!i)
					table[row] = [
						...table[row].slice(0, centerCol),
						...values,
						...new Array(centerCol - values.length).fill(null),
					]
				}
			})
			return table

		case 8:
			emptyPoint.forEach(([row, col]) => {
				if (row >= centerRow) {
					const values = []
					for (let i = centerRow; i < rows - 1; i += 1) {
						if (table[i][col]) values.push(table[i][col])
					}
					for (let i = 0; i < centerRow; i += 1) {
						if (values[i]) table[centerRow + i][col] = values[i]
						else table[centerRow + i][col] = null
					}
				} else {
					const values: TYPE_ROW = []
					for (let i = 0; i < centerRow; i += 1) {
						if (table[i][col]) values.push(table[i][col])
					}
					for (let i = centerRow - 1; i > 0; i -= 1) {
						table[i][col] = values.pop() || null
					}
				}
			})
			return table

		case 9:
			emptyPoint.forEach(([row, col]) => {
				if (row >= centerRow) {
					const values = []
					for (let i = centerRow; i < rows - 1; i += 1) {
						if (table[i][col]) values.push(table[i][col])
					}
					for (let i = 0; i < centerRow; i += 1) {
						if (values[i]) table[centerRow + i][col] = values[i]
						else table[centerRow + i][col] = null
					}
				} else {
					const values: TYPE_ROW = []
					for (let i = 0; i < centerRow; i += 1) {
						if (table[i][col]) values.push(table[i][col])
					}
					for (let i = centerRow - 1; i > 0; i -= 1) {
						table[i][col] = values.pop() || null
					}
				}
			})
			table = table.map((row) => {
				const left = row.slice(0, centerCol).filter((i) => !!i)
				const right = row.slice(centerCol).filter((i) => !!i)
				return [
					...new Array(centerCol - left.length).fill(null),
					...left,
					...right,
					...new Array(centerCol - right.length).fill(null),
				]
			})
			return table

		default:
			throw new Error(`Invalid level: ${level}`)
	}
}

export function canConnect(table: TYPE_GRID, start: ICoord, end: ICoord) {
	return isTruePair(table, start, end)
}

export function findNextPair(cur: [number, number], table: TYPE_GRID) {
	const rows = table.length
	const cols = table[0].length
	const startRow = cur[1] === cols - 2 ? cur[0] + 1 : cur[0]

	if (!startRow || startRow === rows - 1) return false

	const curItem = table[cur[0]][cur[1]]

	for (let r1 = startRow; r1 < rows - 1; r1++) {
		const startCol = r1 === cur[0] ? cur[1] + 1 : 1
		for (let c1 = startCol; c1 < cols - 1; c1++) {
			if (r1 === cur[0] && c1 === cur[1]) continue
			if (table[r1][c1] === null || curItem?.type !== table[r1][c1]?.type)
				continue
			if (canConnect(table, { row: cur[0], col: cur[1] }, { row: r1, col: c1 }))
				return true
		}
	}

	return false
}

export function hasPossibleMove(table: TYPE_GRID) {
	const rows = table.length
	const cols = table[0].length

	for (let r1 = 1; r1 < rows - 1; r1++) {
		for (let c1 = 1; c1 < cols - 1; c1++) {
			if (table[r1][c1] === null) continue
			if (findNextPair([r1, c1], table)) return true
		}
	}

	return false
}

export function noMoves(board: TYPE_GRID): boolean {
	return !hasPossibleMove(board)
}
