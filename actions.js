import { Regex } from '@companion-module/base'
import { pad0 } from './helpers.js'

export function buildStaticActions(self) {
	const sendOSCCmd = async(cmd, arg) => (
		await self.sendOSC(cmd, arg)
	)

	let actions = {
		label: {
			name: 'Set label',
			options: [
				{
					type: 'dropdown',
					label: 'Type',
					id: 'type',
					choices: [
						{ id: '/ch/', label: 'Channel 1-16' },
						{ id: '/rtn/', label: 'Fx Return 1-4' },
						{ id: '/fxsend/', label: 'Fx Send 1-4' },
						{ id: '/bus/', label: 'Bus 1-6' },
					],
					default: '/ch/',
				},
				{
					type: 'textinput',
					label: 'Channel, Fx Return, Fx Send or Bus Number',
					id: 'num',
					default: '1',
					regex: Regex.NUMBER,
				},
				{
					type: 'textinput',
					label: 'Label',
					id: 'lab',
					default: '',
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				const arg = {
					type: 's',
					value: '' + opt.lab,
				}
				nVal = opt.type == '/ch/' ? pad0(opt.num) : opt.num
				await sendOSCCmd(opt.type + nVal + '/config/name', arg)
			},
		},

		mLabel: {
			name: 'Set Main label',
			options: [
				{
					type: 'textinput',
					label: 'Label',
					id: 'lab',
					default: '',
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				await sendOSCCmd('/lr/config/name', { type: 's', value: '' + opt.lab })
			},
		},

		usbLabel: {
			name: 'Set USB/Aux label',
			options: [
				{
					type: 'textinput',
					label: 'Label',
					id: 'lab',
					default: 'USB',
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				await sendOSCCmd('/rtn/aux/config/name', { type: 's', value: '' + opt.lab })
			},
		},

		color: {
			name: 'Set color',
			options: [
				{
					type: 'dropdown',
					label: 'Type',
					id: 'type',
					choices: [
						{ id: '/ch/', label: 'Channel 1-16' },
						{ id: '/rtn/', label: 'Fx Return 1-4' },
						{ id: '/fxsend/', label: 'Fx Send 1-4' },
						{ id: '/bus/', label: 'Bus 1-6' },
					],
					default: '/ch/',
				},
				{
					type: 'textinput',
					label: 'Channel, Fx Return, Fx Send or Bus Number',
					id: 'num',
					default: '1',
					regex: Regex.NUMBER,
				},
				{
					type: 'dropdown',
					label: 'color',
					id: 'col',
					choices: self.COLOR_VALUES,
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				const arg = {
					type: 'i',
					value: parseInt(opt.col),
				}
				nVal = opt.type == '/ch/' ? pad0(opt.num) : opt.num
				await sendOSCCmd(opt.type + nval + '/config/color', arg)
			},
		},

		mColor: {
			name: 'Set Main color',
			options: [
				{
					type: 'dropdown',
					label: 'color',
					id: 'col',
					choices: self.COLOR_VALUES,
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				await sendOSCCmd('/lr/config/color', { type: 'i', value: parseInt(opt.col) })
			},
		},

		usbColor: {
			name: 'Set USB color',
			options: [
				{
					type: 'dropdown',
					label: 'color',
					id: 'col',
					choices: self.COLOR_VALUES,
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				await sendOSCCmd('/rtn/aux/config/color', { type: 'i', value: parseInt(opt.col) })
			},
		},

		load_snap: {
			name: 'Load Console Snapshot',
			options: [
				{
					type: 'textinput',
					label: 'Snapshot Number 1-64',
					id: 'snap',
					default: 1,
					min: 1,
					max: 64,
					regex: Regex.NUMBER,
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				await sendOSCCmd('/-snap/load', { type: 'i', value: parseInt(opt.snap) })
			},
		},

		next_snap: {
			name: 'Load Next Console Snapshot',
			options: [],
			callback: async (action, context) => {
				const opt = action.options
				await sendOSCCmd('/-snap/load', { type: 'i', value: parseInt(opt.snap) })
			},
		},

		prev_snap: {
			name: 'Load Prior Console Snapshot',
			options: [],
			callback: async (action, context) => {
				const snap = Math.max(--self.currentSnapshot,1)
				await sendOSCCmd('/-snap/load', { type: 'i', value: snap })
			},
		},

		save_snap: {
			name: 'Save Current Console Snapshot',
			options: [],
			callback: async (action, context) => {
				const snap = Math.min(--self.currentSnapshot,1)
				await sendOSCCmd('/-snap/save', { type: 'i', value: snap } )
			},
		},

		tape: {
			name: 'Tape Operation',
			options: [
				{
					type: 'dropdown',
					label: 'Function',
					id: 'tFunc',
					choices: self.TAPE_FUNCTIONS,
				},
			],
			callback: async (action, context) => {
				const opt = action.options
				await sendOSCCmd('/-stat/tape/state', { type: 'i', value: parseInt(opt.tFunc) })
			},

		},
	}
	Object.assign(self.actionDefs, actions)
}
