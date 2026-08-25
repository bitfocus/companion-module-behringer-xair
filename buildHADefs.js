import { pad0, fadeTo, setToggle, linFaderToDB } from './helpers.js'
import { combineRgb, InstanceStatus } from '@companion-module/base'

export function buildHADefs(self) {
	let haActions = {}
	let haFeedbacks = {}
	let haVariables = []
	let ppRange = [1, 4]
	const mc = self.config.channels
	let haChoices = []
	let ppChoices = []

	for (let s = 1; s <= 24; s++) {
		let c = pad0(s)
		let baseID = `/headamp/${c}/`
		let fID = `ha_gain${c}`
		let aID = fID
		let vID = `ha_gain${s}`
		let theID = baseID + 'gain'
		self.fbToStat[fID] = theID
		self.xStat[theID] = {
			varID: vID,
			valid: false,
			fSteps: self.HA_CONFIG[s].fSteps,
			fbID: fID,
			polled: 0,
		}
		if (self.HA_CONFIG[s][mc].has) {
			let haName = self.HA_CONFIG[s][mc].name + ' Gain'
			haChoices.push({ id: s, label: `${s}: ${self.HA_CONFIG[s][mc].name}` })

			haVariables.push({
				name: haName + ' %',
				variableId: vID + '_p',
			})
			haVariables.push({
				name: haName + ' dB',
				variableId: vID + '_d',
			})
			if (self.HA_CONFIG[s].ph) {
				fID = `ha_pp${c}`
				vID = `ha_pp${s}`
				theID = baseID + 'phantom'
				self.fbToStat[fID] = theID
				self.xStat[theID] = {
					varID: vID,
					valid: false,
					fbID: fID,
					fbSubs: new Set(),
					polled: 0,
					pp: false,
				}
				haVariables.push({
					name: self.HA_CONFIG[s][mc].name + ' Phantom',
					variableId: vID,
				})
				ppChoices.push({ id: s, label: `${s}: ${self.HA_CONFIG[s][mc].name}` })
				ppRange[2] = Math.max(ppRange[2], s)
			}
		}
	}

	haActions['phantom'] = {
		name: `Phantom Power`,
		options: [
			{
				type: 'dropdown',
				label: 'XLR',
				id: 'num',
				default: '1',
				choices: ppChoices,
			},
			{
				type: 'dropdown',
				label: 'Value',
				id: 'set',
				default: '2',
				choices: [
					{ id: '1', label: 'On' },
					{ id: '0', label: 'Off' },
					{ id: '2', label: 'Toggle' },
				],
			},
		],
		callback: async (action, context) => {
			const opt = action.options
			const aId = opt.act
			const whichPp = '/headamp/' + pad0(opt.num) + '/phantom'
			const arg = {
				type: 'i',
				value: setToggle(self.xStat[whichPp].pp, action.options.set),
			}
			self.sendOSC(whichPp, arg)
		},
	}

	haFeedbacks['pp'] = {
		type: 'boolean',
		name: 'Phantom',
		description: 'Indicate Phantom Power on button',
		options: [
			{
				type: 'dropdown',
				label: 'XLR',
				id: 'num',
				default: '1',
				choices: ppChoices,
			},
			{
				type: 'dropdown',
				label: 'State',
				id: 'state',
				default: '1',
				choices: [
					{ id: '1', label: 'On' },
					{ id: '0', label: 'Off' },
				],
			},
		],
		defaultStyle: {
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(64, 0, 0),
		},
		subscribe: async (feedback, context) => {
			const num = feedback.options.num
			const whichPp = `/headamp/${pad0(num)}/phantom`
			if (num) {
				self.xStat[whichPp].fbSubs.add(feedback.id)
			}
		},
		unsubscribe: async (feedback, context) => {
			const num = feedback.options.num
			const whichPp = `/headamp/${pad0(num)}/phantom`
			if (num) {
				self.xStat[whichPp].fbSubs.delete(feedback.id)
			}
		},
		callback: function (feedback, context) {
			const num = feedback.options.num
			const whichPp = `/headamp/${pad0(num)}/phantom`
			const state = feedback.options.state != '0'

			return self.xStat[whichPp].pp == state
		},
	}

	haActions['headamp'] = {
		name: `Headamp Level`,
		options: [
			{
				type: 'dropdown',
				label: 'Input',
				id: 'num',
				useVariables: true,
				default: haChoices[0].id,
				choices: haChoices,
			},
			{
				type: 'dropdown',
				label: 'Action',
				id: 'act',
				choices: self.LEVEL_CHOICES.slice(0, 2),
				default: '',
			},
			{
				type: 'checkbox',
				label: 'Set as DB?',
				id: 'db',
				default: true,
				isVisible: (options) => options.act == '',
			},
			{
				type: 'textinput',
				label: 'Level',
				id: 'fad',
				default: '0.0',
				useVariables: true,
				isVisible: (options) => options.act == '',
			},
			{
				type: 'textinput',
				label: 'By',
				id: 'ticks',
				default: '1',
				useVariables: true,
				isVisible: (options) => options.act == '_a',
			},
		],
		callback: async (action, context) => {
			let opt = action.options
			const aId = opt.act
			const whichHa = '/headamp/' + pad0(opt.num) + '/gain'
			if (opt.db) {
				const lim = self.LIMITS['h' + self.xStat[whichHa].fSteps]
				opt.fad = (opt.fad - lim.fmin) / (lim.fmax - lim.fmin)
			}
			try {
				let fVal = await fadeTo(aId, whichHa, opt, self)

				self.sendOSC(whichHa, { type: 'f', value: fVal })
			} catch (error) {
				const err = [action.controlId, error.message].join(' → ')
				self.updateStatus(InstanceStatus.BadConfig, err)
				self.paramError = true
			}
		},
	}

	Object.assign(self.actionDefs, haActions)
	Object.assign(self.haFeedbacks, haFeedbacks)
	self.variableDefs.push(...haVariables)
}
