import { combineRgb } from '@companion-module/base'
import { pad0 } from './helpers.js'

export function buildConstants(self) {
	// discreet float values for faders (1024)
	self.fLevels[1024] = []
	for (let i = 0; i < 1024; i++) {
		self.fLevels[1024][i] = Math.min(
			1.0,
			Math.floor((Math.round(self.stepsToFader(i, 1024) * 1023.5) / 1023) * 10000) / 10000
		)
	}

	self.levelOpts = [
		{ op: '', act: 'Set' },
		{ op: '_a', act: 'Adjust' },
		{ op: '_s', act: 'Store' },
		{ op: '_r', act: 'Recall' },
	]


	// pre-set linear values for various other 'levels'
	const lvls = [
		161, // sends
		101, // pan
		145, // trim, headamp gain
		65, // aux gain
	]

	for (let lvl of lvls) {
		self.fLevels[lvl] = []
		for (let i = 0; i < lvl; i++) {
			self.fLevels[lvl][i] = self.stepsToFader(i, lvl)
		}
	}

	self.STORE_LOCATION = []

	for (let i = 1; i <= 10; i++) {
		var i2 = pad0(i)

		self.STORE_LOCATION.push({
			label: `Global ${i}`,
			id: `gs_${i2}`,
		})
	}

	self.FADER_VALUES = [
		{ label: '- ∞', id: '0.0' },
		{ label: '-50 dB: ', id: '0.1251' },
		{ label: '-30 dB', id: '0.251' },
		{ label: '-20 dB', id: '0.375' },
		{ label: '-18 dB', id: '0.4' },
		{ label: '-15 dB', id: '0.437' },
		{ label: '-12 dB', id: '0.475' },
		{ label: '-9 dB', id: '0.525' },
		{ label: '-6 dB', id: '0.6' },
		{ label: '-3 dB', id: '0.675' },
		{ label: '-2 dB', id: '0.7' },
		{ label: '-1 dB', id: '0.725' },
		{ label: '0 dB', id: '0.75' },
		{ label: '+1 dB', id: '0.775' },
		{ label: '+2 dB', id: '0.8' },
		{ label: '+3 dB', id: '0.825' },
		{ label: '+4 dB', id: '0.85' },
		{ label: '+5 dB', id: '0.875' },
		{ label: '+6 dB', id: '0.9' },
		{ label: '+9 dB', id: '0.975' },
		{ label: '+10 dB', id: '1.0' },
	]

	self.COLOR_VALUES = [
		{ label: 'Off', id: '0', bg: 0, fg: combineRgb(64, 64, 64) },
		{ label: 'Red: ', id: '1', bg: combineRgb(224, 0, 0), fg: 0 },
		{ label: 'Green', id: '2', bg: combineRgb(0, 224, 0), fg: 0 },
		{ label: 'Yellow', id: '3', bg: combineRgb(224, 224, 0), fg: 0 },
		{ label: 'Blue', id: '4', bg: combineRgb(0, 0, 224), fg: 0 },
		{ label: 'Magenta', id: '5', bg: combineRgb(224, 0, 224), fg: 0 },
		{ label: 'Cyan', id: '6', bg: combineRgb(0, 192, 224), fg: 0 },
		{ label: 'White', id: '7', bg: combineRgb(224, 224, 224), fg: 0 },
		{ label: 'Off Inverted', id: '8', bg: combineRgb(64, 64, 64), fg: 0 },
		{ label: 'Red Inverted', id: '9', bg: 0, fg: combineRgb(224, 0, 0) },
		{ label: 'Green Inverted', id: '10', bg: 0, fg: combineRgb(0, 224, 0) },
		{ label: 'Yellow Inverted', id: '11', bg: 0, fg: combineRgb(224, 224, 0) },
		{ label: 'Blue Inverted', id: '12', bg: 0, fg: combineRgb(0, 0, 224) },
		{ label: 'Magenta Inverted', id: '13', bg: 0, fg: combineRgb(224, 0, 224) },
		{ label: 'Cyan Inverted', id: '14', bg: 0, fg: combineRgb(0, 192, 224) },
		{ label: 'White Inverted', id: '15', bg: 0, fg: combineRgb(224, 224, 224) },
	]

	self.TAPE_FUNCTIONS = [
		{ label: 'STOP', id: '0' },
		{ label: 'PLAY PAUSE', id: '1' },
		{ label: 'PLAY', id: '2' },
		{ label: 'RECORD PAUSE', id: '3' },
		{ label: 'RECORD', id: '4' },
		{ label: 'FAST FORWARD', id: '5' },
		{ label: 'REWIND', id: '6' },
	]
}
