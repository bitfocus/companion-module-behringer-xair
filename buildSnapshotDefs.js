import { pad0 } from './helpers.js'

export function buildSnapshotDefs(self) {
	let snapVars = []

	for (let s = 1; s <= 64; s++) {
		let c = pad0(s)
		let theID = `/-snap/${c}/name`
		let fID = 's_name_' + c
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
