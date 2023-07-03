import { pad0 } from './helpers.js'

export function buildHADefs(self) {
	let haActions = {}
	let haVariables = {}

	for (let s = 1; s <= 24; s++) {
		let c = pad0(s)
		let baseID = `/headamp/${c}/`
		let baseFID = 'ha' + c
		let theID = baseID + 'gain'
		self.fbToStat[fID] = theID
		self.xStat[theID] = {
			name: 'ha' + c + '_gain',
			valid: false,
			fbID: fID,
			polled: 0,
		}
		haVariables.push({
			name: 'Head Amp ' + c ,
			variableId: fID,
		})
		self.snapshot[s] = theID
	}
	self.variableDefs.push(...snapVars)
}
