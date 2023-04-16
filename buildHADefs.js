import { pad0 } from './helpers.js'

export function buildHADefs(self) {
	let haActions = {}
	let haVariables = {}

	for (let s = 1; s <= 16; s++) {
		let c = pad0(s)
		let theID = `/headamp/${c}/`
		let fID = 'ha' + c
		self.fbToStat[fID] = theID
		self.xStat[theID] = {
			name: '#' + c,
			defaultName: '#' + c,
			valid: false,
			fbID: fID,
			polled: 0,
		}
		snapVars.push({
			name: 'Snapshot ' + c + ' Name',
			variableId: fID,
		})
		self.snapshot[s] = theID
	}
	self.variableDefs.push(...snapVars)
}
