import { pad0 } from './helpers.js'

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
			trim: self.HA_CONFIG[s].trim,
			fbID: fID,
			//trim: 0,
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
		headamp: {
			name: `Headamp Level`,
			options: [
				{
					type: 'dropdown',
					label: 'Input',
					id: 'input',
					choices: haChoices,
				},
				{
					type: 'dropdown',
					label: 'Action',
					id: 'act',
					choices: self.levelOpts,
					default: '',
				},
			],
		},
	}

	self.variableDefs.push(...haVariables)
}
