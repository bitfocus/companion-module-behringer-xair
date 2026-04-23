import { pad0, fadeTo } from './helpers.js'

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
			trimVal: self.HA_CONFIG[s].trimVal,
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

	const act = `headamp`
	haActions[act] = {
		name: `Headamp Level`,
		options: [
			{
				type: 'dropdown',
				label: 'Input',
				id: 'input',
				useVariables: true,
				default: haChoices[0].id,
				choices: haChoices,
			},
			{
				type: 'dropdown',
				label: 'Action',
				id: 'act',
				choices: self.LEVEL_CHOICES,
				default: '',
			},
			{
				type: 'textinput',
				label: 'Set',
				id: 'set',
				default: '0',
				useVariables: true,
				isVisible: (options)=> options.act='',
			}
		],
		callback: async (action, context) => {
			const aId = action.act
			const strip = '/headamp/' + pad0(opt.num) + '/gain'
			try {
				let fVal = await fadeTo(aId, strip, opt, self)

				if ('_s' != aId.slice(-2)) {
					// store is local, no console command
					self.sendOSC(strip, { type: 'f', value: fVal })
				}
			} catch (error) {
				const err = [action.controlId, error.message].join(' → ')
				self.updateStatus(InstanceStatus.BadConfig, err)
				self.paramError = true
			}
		},
	}
	Object.assign(self.actionDefs, haActions)
	self.variableDefs.push(...haVariables)
}
