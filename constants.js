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
	// todo: continue from here
	self.LIMITS = {
		1024: { fmin: -100, fmax: 10 }, // main faders
		161: { fmin: -100, fmax: 10 }, // sends, solo level
		101: { fmin: -100, fmax: 100 }, // pan
		145: { fmin: -12, fmax: 60 }, // headamp gain
		73: { fmin: -18, fmax: 18 }, // solo source trim
		65: { fmin: -12, fmax: 20 }, // aux gain
		40: { fmin: -40, fmax: 0 }, // solo dim att/gain
	}

	const lvls = [
		161, // sends, solo level
		101, // pan
		145, // headamp gain
		73, // solo source trim
		65, // aux gain
		40, // solo dim att/gain
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

	self.MONITOR_SOURCES = [
		{ id: 0, label: 'Off' },
		{ id: 1, label: 'LR' },
		{ id: 2, label: 'LR (PFL)' },
		{ id: 3, label: 'LR (AFL)' },
		{ id: 4, label: 'AUX' },
		{ id: 5, label: 'USB 17/18' },
		{ id: 6, label: 'Bus 1' },
		{ id: 7, label: 'Bus 2' },
		{ id: 8, label: 'Bus 3' },
		{ id: 9, label: 'Bus 4' },
		{ id: 10, label: 'Bus 5' },
		{ id: 11, label: 'Bus 6' },
		{ id: 12, label: 'Bus 1/2' },
		{ id: 13, label: 'Bus 3/4' },
		{ id: 14, label: 'Bus 5/6' },
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

	self.BAR_LOCATION = [
		{ id: 't', label: 'Top' },
		{ id: 'b', label: 'Bottom' },
		{ id: 'l', label: 'Left' },
		{ id: 'r', label: 'Right' },
	]

	self.MIXER_MODEL = {
		XR12: { desc: 'XAir 12 Rack', channels: 12 },
		XR16: { desc: 'XAir 16 Rack', channels: 16 },
		XR18: { desc: 'XAir 18 Rack', channels: 18 },
		X18: { desc: 'XAir 18 Desk', channels: 18 },
	}

	self.MIXER_CHOICES = []
	Object.entries(self.MIXER_MODEL).forEach(([key, val]) => {
		self.MIXER_CHOICES.push({
			id: key,
			label: val.desc,
		})
	})

	self.HA_CONFIG = [
		{
			12: { name: '', has: false },
			16: { name: '', has: false },
			18: { name: '', has: false },
		},
	]

	for (let c = 1; c < 25; c++) {
		switch (c) {
			case 1:
			case 2:
			case 3:
			case 4:
				self.HA_CONFIG[c] = {
					12: { name: `XLR ${c}`, has: true },
					16: { name: `XLR ${c}`, has: true },
					18: { name: `XLR ${c}`, has: true },
					trim: 145,
					ph: true,
				}
				break
			case 5:
			case 6:
			case 7:
			case 8:
				self.HA_CONFIG[c] = {
					12: { name: '', has: false },
					16: { name: `XLR ${c}`, has: true },
					18: { name: `XLR ${c}`, has: true },
					trim: 145,
					ph: true,
				}
				break
			case 9:
			case 10:
			case 11:
			case 12:
			case 13:
			case 14:
			case 15:
			case 16:
				self.HA_CONFIG[c] = {
					12: { name: '', has: false },
					16: { name: '', has: false },
					18: { name: `XLR ${c}`, has: true },
					trim: 145,
					ph: true,
				}
				break
			case 17:
				self.HA_CONFIG[c] = {
					12: { name: `TRS ${c - 16}`, has: true },
					16: { name: `TRS ${c - 16}`, has: true },
					18: { name: 'RCA', has: true },
					trim: 65,
					ph: false,
				}
				break
			case 18:
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
				self.HA_CONFIG[c] = {
					12: { name: `TRS ${c - 16}`, has: true },
					16: { name: `TRS ${c - 16}`, has: true },
					18: { name: '', has: false },
					trim: 65,
					ph: false,
				}
				break
		}
	}
}
