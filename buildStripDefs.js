'use strict'
import { defStrip } from './defStrip.js'
import { combineRgb, Regex } from '@companion-module/base'
import { pad0, unSlash, setToggle, fadeTo } from './helpers.js'

// build the channel strip actions/feedbaks/variables
// injects results to the base module via self
export function buildStripDefs(self) {
	let stat = {}
	let muteActions = {}
	let procActions = {}
	let trimActions = {}
	let fadeActions = {}
	let storeActions = {}
	let sendActions = {}
	let muteFeedbacks = {}
	let colorFeedbacks = {}
	let defVariables = []
	let fbToStat = {}

	let busOpts = []

	const defProc = {
		insert: {
			node: 'insert/on',
			desc: 'Insert FX',
		},
		gate: {
			node: 'gate/on',
			desc: 'Noise Gate',
		},
		eq: {
			node: 'eq/on',
			desc: 'EQ',
		},
		dyn: {
			node: 'dyn/on',
			desc: 'Compressor',
		},
		lr: {
			node: 'mix/lr',
			desc: 'Main Out',
		},
	}

	for (let b = 1; b < 11; b++) {
		busOpts.push({
			label: b < 7 ? ' Bus ' + b : ' FX ' + (b - 6),
			id: b,
		})
	}

	function capFirst(string) {
		return string.charAt(0).toUpperCase() + string.slice(1)
	}

	function sendLabel(d, min, max) {
		return d + (min == 0 ? '' : ' ' + min + '-' + max)
	}

	for (const theStrip of defStrip) {
		let fbID = theStrip.id
		let chID = '/' + fbID
		let muteID = theStrip.muteID
		let fadeID = theStrip.fadeID
		let d = theStrip.digits
		let muteChoice = [theStrip.hasOn ? '0' : '1', theStrip.hasOn ? '1' : '0', '2']
		let muteSfx = (theStrip.hasMix ? '/mix' : '') + (theStrip.hasOn ? '/on' : '')
		let fadeSfx = (theStrip.hasMix ? '/mix' : '') + (theStrip.hasOn ? '/fader' : '')
		let labelSfx = theStrip.hasOn ? '/config' : ''
		let defaultLabel = theStrip.label
		if (defaultLabel != '' && d > 0) {
			defaultLabel = defaultLabel + ' '
		}

		// additional strip toggles

		for (let p of theStrip.proc) {
			const mID = theStrip.procPfx + p
			if (0 == d) {
				// LR, rtn/aux (usb)
				procActions[mID] = {
					name: `${theStrip.description} ${defProc[p].desc} State`,
					options: [
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
						const p = action.actionId.split('_')
						const cmd = p[0] == 'm' ? `/lr/${p[1]}/on` : `/rtn/aux/${p[1]}/on`
						const arg = {
							type: 'i',
							value: setToggle(self.xStat[cmd].isOn, action.options.set),
						}
						self.sendOSC(cmd, arg)
					},
				}
			} else {
				if (mID in procActions) {
					const l = `${theStrip.description} ${theStrip.min}-${theStrip.max}`
					procActions[mID].options[0].choices.push({
						id: `${chID}/`,
						label: l,
					})
					procActions[mID].options[1].label += `, ${theStrip.description}`
				} else {
					procActions[mID] = {
						name: defProc[p].desc + ' State',
						options: [
							{
								type: 'dropdown',
								label: 'Type',
								id: 'type',
								choices: [
									{
										id: `${chID}/`,
										label: `${theStrip.description} ${theStrip.min}-${theStrip.max}`,
									},
								],
								default: chID + '/',
							},
							{
								type: 'number',
								label: theStrip.description,
								id: 'num',
								default: 1,
								min: theStrip.min,
								max: theStrip.max,
								range: false,
								required: true,
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
							const nVal = opt.type == '/ch/' ? pad0(opt.num) : opt.num
							const cmd =
								action.actionId == 'lr' ? opt.type + nVal + '/mix/lr' : opt.type + nVal + '/' + action.actionId + '/on'
							const arg = {
								type: 'i',
								value: setToggle(self.xStat[cmd].isOn, opt.set),
							}
							self.sendOSC(cmd, arg)
						},
					}
				}
			}

			// console.log(`${chID}/${defProc[p].node} "${theStrip.description} ${defProc[p].desc}"`);
		}

		if (muteID in muteActions) {
			muteActions[muteID].options[0].choices.push({
				id: chID + '/',
				label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
			})
			const l = muteActions[muteID].options[1].label + ', ' + theStrip.description
			muteActions[muteID].options[1].label = l
		} else {
			if (theStrip.hasOn == true) {
				if (d > 0) {
					// one of the channel mutes
					muteActions[muteID] = {
						name: 'Mute ' + theStrip.description,
						options: [
							{
								type: 'dropdown',
								label: 'Type',
								id: 'type',
								choices: [
									{
										id: chID + '/',
										label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
									},
								],
								default: chID + '/',
							},
							{
								type: 'number',
								label: theStrip.description,
								id: 'num',
								default: 1,
								min: theStrip.min,
								max: theStrip.max,
								range: false,
								required: true,
							},
						],
						callback: async (action, context) => {
							let opt = action.options
							const nVal = opt.type == '/ch/' ? pad0(opt.num) : opt.num
							let cmd = opt.type + nVal
							if (opt.type == '/dca/') {
								cmd += '/on'
							} else {
								cmd += '/mix/on'
							}
							const arg = {
								type: 'i',
								value: setToggle(self.xStat[cmd].isOn, opt.mute),
							}
							self.sendOSC(cmd, arg)
						},
					}
				} else {
					// Main LR, Aux/USB
					muteActions[muteID] = {
						name: 'Mute ' + theStrip.description,
						options: [],
						callback: async (action, context) => {
							const cmd = action.actionId == 'mMute' ? '/lr/mix/on' : '/rtn/aux/mix/on'
							const arg = {
								type: 'i',
								value: setToggle(self.xStat[cmd].isOn, action.options.mute),
							}
							self.sendOSC(cmd, arg)
						},
					}
				}
			} else {
				// Mute Group
				muteActions[muteID] = {
					name: theStrip.description,
					options: [
						{
							type: 'number',
							label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
							id: 'mute_grp',
							default: '1',
							min: theStrip.min,
							max: theStrip.max,
							range: false,
							required: true,
						},
					],
					callback: async (action, context) => {
						const opt = action.options
						const cmd = '/config/mute/' + opt.mute_grp
						const arg = {
							type: 'i',
							value: setToggle(self.xStat[cmd].isOn, opt.mute),
						}
						self.sendOSC(cmd, arg)
					},
				}
			}

			muteActions[muteID].options.push({
				type: 'dropdown',
				label: 'Mute / Unmute',
				id: 'mute',
				default: '2',
				choices: [
					{ id: muteChoice[0], label: 'Mute' },
					{ id: muteChoice[1], label: 'Unmute' },
					{ id: '2', label: 'Toggle' },
				],
			})
		}

		// add new channel type to dropdown choices
		if (fadeActions[fadeID] !== undefined) {
			let l = ''
			fadeActions[fadeID].options[0].choices.push({
				id: chID + '/',
				label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
			})
			l = fadeActions[fadeID].options[1].label + ', ' + theStrip.description
			fadeActions[fadeID].options[1].label = l

			fadeActions[fadeID + '_a'].options[0].choices.push({
				id: chID + '/',
				label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
			})
			l = fadeActions[fadeID + '_a'].options[1].label + ', ' + theStrip.description
			fadeActions[fadeID + '_a'].options[1].label = l

			storeActions[fadeID + '_s'].options[0].choices.push({
				id: chID + '/',
				label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
			})
			l = storeActions[fadeID + '_s'].options[1].label + ', ' + theStrip.description
			storeActions[fadeID + '_s'].options[1].label = l

			storeActions[fadeID + '_r'].options[0].choices.push({
				id: chID + '/',
				label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
			})
			l = storeActions[fadeID + '_r'].options[1].label + ', ' + theStrip.description
			storeActions[fadeID + '_r'].options[1].label = l
		} else {
			// new strip
			if (theStrip.hasOn == true) {
				if (d > 0) {
					// one of the channel strips
					fadeActions[fadeID] = {
						name: 'Fader Set',
						options: [
							{
								type: 'dropdown',
								label: 'Type',
								id: 'type',
								choices: [
									{
										id: chID + '/',
										label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
									},
								],
								default: chID + '/',
							},
							{
								type: 'number',
								label: theStrip.description,
								id: 'num',
								default: 1,
								min: theStrip.min,
								max: theStrip.max,
								range: false,
								required: true,
							},
						],
						callback: async (action, context) => {
							const opt = action.options
							let nVal = opt.num
							if (opt.type == '/ch/') {
								nVal = pad0(nVal)
							}
							const cmd = opt.type + nVal + (opt.type == '/dca/' ? '/fader' : '/mix/fader')
							let fVal = fadeTo(action.actionId, cmd, opt, self)
							const arg = {
								type: 'f',
								value: fVal,
							}
							self.sendOSC(cmd, arg)
						},
					}

					fadeActions[fadeID + '_a'] = {
						name: 'Fader Adjust',
						options: [
							{
								type: 'dropdown',
								label: 'Type',
								id: 'type',
								choices: [
									{
										id: chID + '/',
										label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
									},
								],
								default: chID + '/',
							},
							{
								type: 'number',
								label: theStrip.description,
								id: 'num',
								default: 1,
								min: theStrip.min,
								max: theStrip.max,
								range: false,
								required: true,
							},
						],
						callback: async (action, context) => {
							const opt = action.options
							let nVal = (opt.type == '/ch/' ? pad0(opt.num) : opt.num)
							let cmd = opt.type + nVal
							cmd += opt.type == '/dca/' ? '/fader' : '/mix/fader'
							let fVal = fadeTo(action.actionId, cmd, opt, self)
							const arg = {
								type: 'f',
								value: fVal,
							}
							self.sendOSC(cmd, arg)
						},
					}

					storeActions[fadeID + '_s'] = {
						name: 'Store Fader',
						options: [
							{
								type: 'dropdown',
								label: 'Type',
								id: 'type',
								choices: [
									{
										id: chID + '/',
										label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
									},
								],
								default: chID + '/',
							},
							{
								type: 'number',
								label: theStrip.description,
								id: 'num',
								default: 1,
								min: theStrip.min,
								max: theStrip.max,
								range: false,
								required: true,
							},
						],
						callback: async (action, context) => {
							const opt = action.options
							let nVal = opt.num
							if (opt.type == '/ch/') {
								nVal = pad0(nVal)
							}
							let strip = opt.type + nVal
							strip += opt.type == '/dca/' ? '/fader' : '/mix/fader'
							fadeTo(action.actionId, strip, opt, self)
						},
					}

					storeActions[fadeID + '_r'] = {
						name: 'Recall Fader',
						options: [
							{
								type: 'dropdown',
								label: 'Type',
								id: 'type',
								choices: [
									{
										id: chID + '/',
										label: theStrip.description + ' ' + theStrip.min + '-' + theStrip.max,
									},
								],
								default: chID + '/',
							},
							{
								type: 'number',
								label: theStrip.description,
								id: 'num',
								default: 1,
								min: theStrip.min,
								max: theStrip.max,
								range: false,
								required: true,
							},
						],
						callback: async (action, context) => {
							const opt = action.options
							let nVal = opt.num
							if (opt.type == '/ch/') {
								nVal = pad0(nVal)
							}
							let strip = opt.type + nVal
							strip += opt.type == '/dca/' ? '/fader' : '/mix/fader'
							let fVal = fadeTo(action.actionId, strip, opt, self)
							const arg = {
								type: 'f',
								value: fVal,
							}
							self.sendOSC(strip, arg)
						},
					}
				} else {
					// Main LR, Aux/USB
					const strip = fadeID = 'mFad' ? '/lr/mix/fader' : '/rtn/aux/mix/fader'
					fadeActions[fadeID] = {
						name: theStrip.description + ' Fader Set',
						options: [],
						callback: async (action, context) => {
							const opt = action.options
							const fVal = fadeTo(action.actionId, strip, opt, self)
							self.sendOSC(strip, { type: 'f', value: fVal })
						},
					}
					fadeActions[fadeID + '_a'] = {
						name: theStrip.description + ' Fader Adjust',
						options: [],
						callback: async (action, context) => {
							const opt = action.options
							const fVal = fadeTo(action.actionId, strip, opt, self)
							self.sendOSC(strip, { type: 'f', value: fVal })
						},
					}
					storeActions[fadeID + '_s'] = {
						name: 'Store ' + theStrip.description + ' Fader',
						options: [],
						callback: async (action, context) => {
							const opt = action.options
							fadeTo(action.actionId, strip, opt, self)
							// internal only, fadeTo handles the 'store'
						},
					}
					storeActions[fadeID + '_r'] = {
						name: 'Recall ' + theStrip.description + ' Fader',
						options: [],
						callback: async (action, context) => {
							const opt = action.options
							const fVal = fadeTo(action.actionId, strip, opt, self)
							self.sendOSC(strip, { type: 'f', value: fVal })
						},
					}
				} // else mute group (no fader)
			}

			if (theStrip.hasOn) {
				fadeActions[fadeID].options.push({
					type: 'dropdown',
					label: 'Fader Level',
					id: 'fad',
					default: '0.0',
					choices: self.FADER_VALUES,
				})

				fadeActions[fadeID + '_a'].options.push({
					type: 'number',
					tooltip: 'Move fader +/- percent.',
					label: 'Adjust By',
					id: 'ticks',
					min: -100,
					max: 100,
					default: 1,
				})

				for (var sfx of ['', '_a']) {
					fadeActions[fadeID + sfx].options.push({
						type: 'number',
						label: 'Fade Duration (ms)',
						id: 'duration',
						default: 0,
						min: 0,
						step: 10,
						max: 60000,
					})
				}

				storeActions[fadeID + '_s'].options.push({
					type: 'dropdown',
					tooltip: 'Store fader value for later recall',
					label: 'Where',
					id: 'store',
					default: 'me',
					choices: [
						{
							id: 'me',
							label: 'Channel',
						},
						...self.STORE_LOCATION,
					],
				})

				storeActions[fadeID + '_r'].options.push({
					type: 'dropdown',
					tooltip: 'Recall stored fader value',
					label: 'From',
					id: 'store',
					default: 'me',
					choices: [
						{
							id: 'me',
							label: 'Channel',
						},
						...self.STORE_LOCATION,
					],
				})

				storeActions[fadeID + '_r'].options.push({
					type: 'number',
					label: 'Fade Duration (ms)',
					id: 'duration',
					default: 0,
					min: 0,
					step: 10,
					max: 60000,
				})
			}
		}

		// add channel type to send actions
		if (theStrip.hasLevel) {
			let sendID = 'send'
			let l = ''
			if (sendActions[sendID] !== undefined) {
				sendActions[sendID].options[0].choices.push({
					id: chID + '/',
					label: sendLabel(theStrip.description, theStrip.min, theStrip.max),
				})
				l = sendActions[sendID].options[1].label + ', ' + theStrip.description
				sendActions[sendID].options[1].label = l

				sendActions[sendID + '_a'].options[0].choices.push({
					id: chID + '/',
					label: sendLabel(theStrip.description, theStrip.min, theStrip.max),
				})
				l = sendActions[sendID + '_a'].options[1].label + ', ' + theStrip.description
				sendActions[sendID + '_a'].options[1].label = l

				storeActions[sendID + '_s'].options[0].choices.push({
					id: chID + '/',
					label: sendLabel(theStrip.description, theStrip.min, theStrip.max),
				})
				l = storeActions[sendID + '_s'].options[1].label + ', ' + theStrip.description
				storeActions[sendID + '_s'].options[1].label = l

				storeActions[sendID + '_r'].options[0].choices.push({
					id: chID + '/',
					label: sendLabel(theStrip.description, theStrip.min, theStrip.max),
				})
				l = storeActions[sendID + '_r'].options[1].label + ', ' + theStrip.description
				storeActions[sendID + '_r'].options[1].label = l
			} else {
				// new channel
				sendActions[sendID] = {
					name: 'Send Level Set',
					options: [
						{
							type: 'dropdown',
							label: 'Type',
							id: 'type',
							choices: [
								{
									id: chID + '/',
									label: sendLabel(theStrip.description, theStrip.min, theStrip.max),
								},
							],
							default: chID + '/',
						},
						{
							type: 'number',
							label: theStrip.description,
							id: 'chNum',
							default: 1,
							min: theStrip.min,
							max: theStrip.max,
							range: false,
							required: true,
						},
						{
							type: 'dropdown',
							label: 'Bus',
							id: 'busNum',
							choices: busOpts,
							default: 1,
						},
						{
							type: 'dropdown',
							label: 'Fader Level',
							id: 'fad',
							default: '0.0',
							choices: self.FADER_VALUES,
						},
					],
					callback: async (action, context) => {
						const opt = action.options
						let nVal = ''
						if (opt.type == '/ch/') {
							nVal = pad0(opt.chNum) + '/'
						} else if (opt.type == '/rtn/') {
							nVal = parseInt(opt.chNum) + '/'
						}
						const bVal = pad0(opt.busNum)
						const strip = opt.type + nVal + 'mix/' + bVal + '/level'
						fadeTo(action.actionId, strip, opt, self)
					},
				}

				sendActions[sendID + '_a'] = {
					name: 'Send Level Adjust',
					options: [
						{
							type: 'dropdown',
							label: 'Type',
							id: 'type',
							choices: [
								{
									id: chID + '/',
									label: sendLabel(theStrip.description, theStrip.min, theStrip.max),
								},
							],
							default: chID + '/',
						},
						{
							type: 'number',
							label: theStrip.description,
							id: 'chNum',
							default: 1,
							min: theStrip.min,
							max: theStrip.max,
							range: false,
							required: true,
						},
						{
							type: 'dropdown',
							label: 'Bus',
							id: 'busNum',
							choices: busOpts,
							default: 1,
						},
						{
							type: 'number',
							title: 'Move fader +/- percent.',
							label: 'Adjust by',
							id: 'ticks',
							min: -100,
							max: 100,
							default: 1,
						},
					],
					callback: async (action, context) => {
						const opt = action.options
						let nVal = ''
						if (opt.type == '/ch/') {
							nVal = pad0(opt.chNum) + '/'
						} else if (opt.type == '/rtn/') {
							nVal = parseInt(opt.chNum) + '/'
						}
						const bVal = pad0(opt.busNum)
						let strip = opt.type + nVal + 'mix/' + bVal + '/level'
						let fVal = fadeTo(action.actionId, strip, opt, self)
						self.sendOSC(strip, { type: 'f', value: fVal })
					},
				}

				for (var sfx of ['', '_a']) {
					sendActions[sendID + sfx].options.push({
						type: 'number',
						label: 'Fade Duration (ms)',
						id: 'duration',
						default: 0,
						min: 0,
						step: 10,
						max: 60000,
					})
				}

				storeActions[sendID + '_s'] = {
					name: 'Store Send Level',
					options: [
						{
							type: 'dropdown',
							label: 'Type',
							id: 'type',
							choices: [
								{
									id: chID + '/',
									label: sendLabel(theStrip.description, theStrip.min, theStrip.max),
								},
							],
							default: chID + '/',
						},
						{
							type: 'number',
							label: theStrip.description,
							id: 'chNum',
							default: 1,
							min: theStrip.min,
							max: theStrip.max,
							range: false,
							required: true,
						},
						{
							type: 'dropdown',
							label: 'Bus',
							id: 'busNum',
							choices: busOpts,
							default: 1,
						},
						{
							type: 'dropdown',
							tooltip: 'Store send value for later recall',
							label: 'Where',
							id: 'store',
							default: 'me',
							choices: [
								{
									id: 'me',
									label: 'Channel Send',
								},
								...self.STORE_LOCATION,
							],
						},
					],
					callback: async (action, context) => {
						const opt = action.options
						let nVal = ''
						if (opt.type == '/ch/') {
							nVal = pad0(opt.chNum) + '/'
						} else if (opt.type == '/rtn/') {
							nVal = parseInt(opt.chNum) + '/'
						}
						const bVal = pad0(opt.busNum)
						const strip = opt.type + nVal + 'mix/' + bVal + '/level'
						fadeTo(action.actionId, strip, opt, self)
					},
				}

				storeActions[sendID + '_r'] = {
					name: 'Recall Send Level',
					options: [
						{
							type: 'dropdown',
							label: 'Type',
							id: 'type',
							choices: [
								{
									id: chID + '/',
									label: sendLabel(theStrip.description, theStrip.min, theStrip.max),
								},
							],
							default: chID + '/',
						},
						{
							type: 'number',
							label: theStrip.description,
							id: 'chNum',
							default: 1,
							min: theStrip.min,
							max: theStrip.max,
							range: false,
							required: true,
						},
						{
							type: 'dropdown',
							label: 'Bus',
							id: 'busNum',
							choices: busOpts,
							default: 1,
						},
						{
							type: 'dropdown',
							tooltip: 'Recall stored send value',
							label: 'From',
							id: 'store',
							default: 'me',
							choices: [
								{
									id: 'me',
									label: 'Channel Send',
								},
								...self.STORE_LOCATION,
							],
						},
					],
					callback: async (action, context) => {
						const opt = action.options
						let nVal = ''
						if (opt.type == '/ch/') {
							nVal = pad0(opt.chNum) + '/'
						} else if (opt.type == '/rtn/') {
							nVal = parseInt(opt.chNum) + '/'
						}
						const bVal = pad0(opt.busNum)
						const strip = opt.type + nVal + 'mix/' + bVal + '/level'
						let fVal = fadeTo(action.actionId, strip, opt, self)
						self.sendOSC(strip, { type: 'f', value: fVal })
					},
				}

				storeActions[sendID + '_r'].options.push({
					type: 'number',
					label: 'Fade Duration (ms)',
					id: 'duration',
					default: 0,
					min: 0,
					step: 10,
					max: 60000,
				})
			}
		}

		if (d == 0) {
			let theID = chID + muteSfx
			let fID = ''
			fbToStat[fbID] = theID
			stat[theID] = {
				isOn: false,
				hasOn: theStrip.hasOn,
				valid: false,
				fbID: fbID,
				polled: 0,
			}
			// 'proc' routing toggles
			for (let p of theStrip.proc) {
				theID = `${chID}/${defProc[p].node}`
				fID = `${fbID}_${p}`
				stat[theID] = {
					isOn: false,
					hasOn: true,
					valid: false,
					fbID: fID,
					polled: 0,
				}
				fbToStat[fID] = theID
			}
			theID = chID + fadeSfx
			fID = 'f_' + unSlash(fbID)
			fbToStat[fID] = theID
			stat[theID] = {
				fader: 0.0,
				valid: false,
				fbID: fID,
				fSteps: 1024,
				varID: fID,
				polled: 0,
			}
			defVariables.push({
				name: theStrip.description + ' dB',
				variableId: fID + '_d',
			})
			defVariables.push({
				name: theStrip.description + ' %',
				variableId: fID + '_p',
			})
			defVariables.push({
				name: theStrip.description + ' % Relative Loudness',
				variableId: fID + '_rp',
			})
			if ('' != labelSfx) {
				theID = chID + labelSfx + '/name'
				fID = 'l_' + unSlash(fbID)
				fbToStat[fID] = theID
				stat[theID] = {
					name: fbID,
					defaultName: defaultLabel,
					valid: false,
					fbID: fID,
					polled: 0,
				}
				defVariables.push({
					name: theStrip.description + ' Label',
					variableId: fID,
				})
				theID = chID + labelSfx + '/color'
				fID = 'c_' + unSlash(fbID)
				fbToStat[fID] = theID
				stat[theID] = {
					color: 0,
					valid: false,
					fbID: fID,
					polled: 0,
				}
			}
			if (theStrip.hasLevel) {
				for (let b = 1; b < 11; b++) {
					let bOrF = b < 7 ? 'b' : 'f'
					let sChan = b < 7 ? b : b - 6
					theID = chID + '/mix/' + pad0(b) + '/level'
					let sendID = b < 7 ? ' Bus ' + b : ' FX ' + (b - 6)
					fID = 's_' + unSlash(fbID) + '_' + bOrF + sChan
					fbToStat[fID] = theID
					stat[theID] = {
						level: 0.0,
						valid: false,
						fbID: fID,
						fSteps: 161,
						varID: fID,
						polled: 0,
					}
					defVariables.push({
						name: theStrip.description + ' ' + sendID + ' dB',
						variableId: fID + '_d',
					})
					defVariables.push({
						name: theStrip.description + ' ' + sendID + ' %',
						variableId: fID + '_p',
					})
					defVariables.push({
						name: theStrip.description + ' ' + sendID + ' % Relative Loudness',
						variableId: fID + '_rp',
					})
				}
			}
		} else {
			for (let c = theStrip.min; c <= theStrip.max; c++) {
				let theID = chID + '/' + pad0(c, d) + muteSfx
				let fID = fbID + '_' + c
				let fpID = `${unSlash(fbID)}_${p}`
				fbToStat[fID] = theID
				stat[theID] = {
					isOn: false,
					hasOn: theStrip.hasOn,
					valid: false,
					fbID: fbID,
					polled: 0,
				}
				// 'proc' routing toggles
				for (const p of theStrip.proc) {
					theID = `${chID}/${pad0(c, d)}/${defProc[p].node}`
					fpID = `${unSlash(fbID)}_${p}`
					fID = `${fpID}${c}`
					fbToStat[fID] = theID
					stat[theID] = {
						isOn: false,
						hasOn: true,
						valid: false,
						fbID: fpID,
						polled: 0,
					}
				}
				if ('' != fadeSfx) {
					theID = chID + '/' + pad0(c, d) + fadeSfx
					fID = 'f_' + unSlash(fbID) + c
					fbToStat[fID] = theID
					stat[theID] = {
						fader: 0.0,
						valid: false,
						fSteps: 1024,
						fbID: fID,
						varID: fID,
						polled: 0,
					}
					defVariables.push({
						name: theStrip.description + ' ' + c + ' dB',
						variableId: fID + '_d',
					})
					defVariables.push({
						name: theStrip.description + ' ' + c + ' %',
						variableId: fID + '_p',
					})
					defVariables.push({
						name: theStrip.description + ' ' + c + ' % Relative Loudness',
						variableId: fID + '_rp',
					})
					if (theStrip.hasLevel) {
						for (let b = 1; b < 11; b++) {
							let bOrF = b < 7 ? 'b' : 'f'
							let sChan = b < 7 ? b : b - 6
							theID = chID + '/' + pad0(c, d) + '/mix/' + pad0(b) + '/level'
							let sendID = b < 7 ? ' Bus ' + b : ' FX ' + (b - 6)
							fID = 's_' + unSlash(fbID) + c + '_' + bOrF + sChan
							fbToStat[fID] = theID
							stat[theID] = {
								level: 0.0,
								valid: false,
								fbID: fID,
								fSteps: 161,
								varID: fID,
								polled: 0,
							}
							defVariables.push({
								name: capFirst(fbID) + ' ' + c + sendID + ' dB',
								variableId: fID + '_d',
							})
							defVariables.push({
								name: capFirst(fbID) + ' ' + c + sendID + ' %',
								variableId: fID + '_p',
							})
							defVariables.push({
								name: capFirst(fbID) + ' ' + c + sendID + ' % Relative Loudness',
								variableId: fID + '_rp',
							})
						}
					}
				}
				if ('' != labelSfx) {
					theID = chID + '/' + pad0(c, d) + labelSfx + '/name'
					fID = 'l_' + unSlash(fbID) + c
					fbToStat[fID] = theID
					stat[theID] = {
						name: fbID + c,
						defaultName: defaultLabel + c,
						valid: false,
						fbID: fID,
						polled: 0,
					}
					defVariables.push({
						name: theStrip.description + ' ' + c + ' Label',
						variableId: fID,
					})
					theID = chID + '/' + pad0(c, d) + labelSfx + '/color'
					fID = 'c_' + unSlash(fbID) + c
					fbToStat[fID] = theID
					stat[theID] = {
						color: 0,
						valid: false,
						fbID: 'c_' + unSlash(fbID),
						polled: 0,
					}
				}
			}
		}

		// mute feedback defs
		let fbDescription = theStrip.description + ' ' + (theStrip.hasOn ? 'Mute' : '') + ' status'
		muteFeedbacks[fbID] = {
			type: 'boolean',
			name: 'Indicate ' + fbDescription,
			description: 'Indicate ' + fbDescription + ' on button',
			options: [
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
				bgcolor: combineRgb(128, 0, 0),
			},
			callback: function (feedback, context) {
				const theChannel = feedback.options.theChannel
				const fbWhich = feedback.feedbackId
				const state = feedback.options.state != '0'
				let stat

				if (theChannel) {
					stat = self.xStat[self.fbToStat[fbWhich + '_' + theChannel]]
				} else if (fbToStat[fbWhich]) {
					stat = self.xStat[self.fbToStat[fbWhich]]
				}
				return (stat?.isOn != stat?.hasOn) == state
			},
		}
		if (d > 0) {
			muteFeedbacks[fbID].options.push({
				type: 'number',
				label: theStrip.description + ' number',
				id: 'theChannel',
				default: 1,
				min: theStrip.min,
				max: theStrip.max,
				range: false,
				required: true,
			})
		}
		// 'proc' routing toggles
		for (var p of theStrip.proc) {
			fbDescription = `${theStrip.description} ${defProc[p].desc} status`
			let fID = `${fbID}_${p}`
			muteFeedbacks[fID] = {
				type: 'boolean',
				name: 'Indicate ' + fbDescription,
				description: 'Indicate ' + fbDescription + ' on button',
				options: [
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
					color: combineRgb(192, 192, 192),
					bgcolor: combineRgb(0, 92, 128),
				},
				callback: function (feedback, context) {
					const theChannel = feedback.options.theChannel
					const fbWhich = feedback.feedbackId
					const state = feedback.options.state != '0'
					let stat

					if (theChannel) {
						stat = self.xStat[fbToStat[fbWhich + theChannel]]
					} else if (fbToStat[fbWhich]) {
						stat = self.xStat[fbToStat[fbWhich]]
					}
					return stat?.isOn == state
				},
			}
			if (d > 0) {
				muteFeedbacks[fID].options.push({
					type: 'number',
					label: theStrip.description + ' number',
					id: 'theChannel',
					default: 1,
					min: theStrip.min,
					max: theStrip.max,
					range: false,
					required: true,
				})
			}
		}

		// channel color feedbacks
		if (theStrip.hasOn) {
			fbDescription = theStrip.description + ' label'
			var cID = 'c_' + unSlash(fbID)
			colorFeedbacks[cID] = {
				type: 'advanced',
				name: 'Color of ' + fbDescription,
				description: 'Use button colors from ' + fbDescription,
				options: [],
				callback: function (feedback, context) {
					const theChannel = feedback.options.theChannel
					const fbWhich = feedback.feedbackId
					let stat
					if (theChannel) {
						stat = self.xStat[fbToStat[fbWhich + theChannel]]
					} else if (fbToStat[fbWhich]) {
						stat = self.xStat[fbToStat[fbWhich]]
					}
					return { color: self.COLOR_VALUES[stat.color].fg, bgcolor: self.COLOR_VALUES[stat.color].bg }
				},
			}
			if (d > 0) {
				colorFeedbacks[cID].options.push({
					type: 'number',
					label: theStrip.description + ' number',
					id: 'theChannel',
					default: 1,
					min: theStrip.min,
					max: theStrip.max,
					range: false,
					required: true,
				})
			}
		}
	}
	// apply channel strip configurations
	Object.assign(self.xStat, stat)
	Object.assign(self.fbToStat, fbToStat)
	Object.assign(self.actionDefs, fadeActions)
	Object.assign(self.actionDefs, sendActions, muteActions, procActions, storeActions)
	Object.assign(self.muteFeedbacks, muteFeedbacks)
	Object.assign(self.colorFeedbacks, colorFeedbacks)
	self.variableDefs.push(...defVariables)
}
