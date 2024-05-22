import { Regex } from '@companion-module/base'

// Return config fields for web config
	export function getConfigFields() {
		let cf = []
		cf.push({
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			tooltip: 'The IP of the MR / XR console',
			width: 6,
			default: '0.0.0.0',
			regex: Regex.IP,
		})
		cf.push({
			type: 'checkbox',
			id: 'scan',
			label: 'Scan network for XAir mixers?',
			default: true,
			width: 12,
		})

		let ch = []
		if (Object.keys(this.unitsFound || {}).length == 0) {
			ch = [{ id: 'none', label: 'No XAir units located' }]
		} else {
			let unit = this.unitsFound
			for (let u in unit) {
				ch.push({ id: unit[u].m_name, label: `${unit[u].m_name} (${unit[u].m_ip})` })
			}
		}
		cf.push({
			type: 'dropdown',
			id: 'mixer',
			label: 'Select Mixer by Name',
			tooltip: 'Name and IP of mixers on the network',
			width: 12,
			default: ch[0].id,
			choices: ch,
		})
		return cf
	}
