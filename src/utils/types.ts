export type TYPE_PAGES = 'START' | 'CLASSIC' | 'TIME' | 'GROUP'

export interface ITile {
	key: number
	type: number
}

export interface ICoord {
	row: number
	col: number
}

export type TYPE_ROW = (ITile | null)[]

export type TYPE_GRID = TYPE_ROW[]

export type TYPE_PATH = [number, number][]
