'use strict'
import { defStrip } from './defStrip.js'
import { combineRgb, InstanceStatus } from '@companion-module/base'
import { pad0, unSlash, setToggle, fadeTo } from './helpers.js'

// build the channel strip actions/feedbaks/variables
// injects results to the base module via self
export function buildStripDefs(self) {
	let stat = {}
	let muteActions = {}
	let procActions = {}
	let trimActions = {}
	// let fadeActions = {}
	// let storeActions = {}
	let levelActions = {}
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

	function makeLevelActions(id, aLabel, aId, theStrip) {
		for (let sfx of self.levelOpts) {
			const newName = aLabel + ` Level ${sfx.act}`
			const newLabel = 'send' != id ? aLabel : sendLabel(theStrip.description, theStrip.min, theStrip.max)
			const newId = id + sfx.op
			if (levelActions[newId] !== undefined) {
				// add strip option to action

				levelActions[newId].options[0].choices.push({
					id: aId,
					label: newLabel,
				})
				levelActions[newId].options[1].label += ', ' + theStrip.description
			} else {
				// new action
				levelActions[newId] = {
					name: newName,
					options: [], // default empty
				}
				if (theStrip.digits > 0) {
					levelActions[newId].options = [
						{
							type: 'dropdown',
							label: 'Type',
							id: 'type',
							choices: [
								{
									id: aId,
									label: newLabel,
								},
							],
							default: aId,
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
					]
					levelActions[newId].callback = async (action, context) => {
						const opt = action.options
						const aId = action.actionId
						const nVal = opt.type == '/ch/' ? pad0(opt.num) : opt.num
						const strip = opt.type + nVal + (opt.type == '/dca/' ? '/fader' : '/mix/fader')
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
					}
				} else {
					// Main LR
					const strip = newId.match(/^mFad/) ? '/lr/mix/fader' : '/rtn/aux/mix/fader'
					levelActions[newId].callback = async (action, context) => {
						const opt = action.options
						const aId = action.actionId
						try {
							let fVal = await fadeTo(aId, strip, opt, self)
							self.updateStatus(InstanceStatus.Ok)
							self.paramError = false

							if ('_s' != aId.slice(-2)) {
								// store is local, no console command
								self.sendOSC(strip, { type: 'f', value: fVal })
							}
						} catch (error) {
							const err = [action.controlId, error.message].join(' → ')
							self.updateStatus(InstanceStatus.BadConfig, err)
							self.paramError = true
						}
					}
				}
				if (theStrip.hasLevel && 'send' == id) {
					// bus sends
					levelActions[newId].options.push({
						type: 'dropdown',
						label: 'Bus',
						id: 'busNum',
						choices: busOpts,
						default: 1,
					})
					levelActions[newId].callback = async (action, context) => {
						const opt = action.options
						const aId = action.actionId
						let nVal = ''
						if (opt.type == '/ch/') {
							nVal = pad0(opt.num) + '/'
						} else if (opt.type == '/rtn/') {
							nVal = parseInt(opt.num) + '/'
						}
						const bVal = pad0(opt.busNum)
						const strip = opt.type + nVal + 'mix/' + bVal + '/level'
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
					}
				}
				if (theStrip.hasOn) {
					switch (sfx.op) {
						case '':
							levelActions[newId].options.push({
								type: 'dropdown',
								label: 'Fader Level',
								id: 'fad',
								default: '0.0',
								choices: self.FADER_VALUES,
							})
							break
						case '_a':
							levelActions[newId].options.push({
								type: 'textinput',
								useVariables: true,
								tooltip: 'Move fader +/- percent.',
								label: 'Adjust By',
								id: 'ticks',
								default: '1',
							})
							break
						case '_s':
							levelActions[newId].options.push({
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
							break
						case '_r':
							levelActions[newId].options.push({
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
					}

					if (sfx.op != '_s') {
						// all but store have a fade time
						levelActions[newId].options.push(
							...[
								{
									type: 'number',
									label: 'Fade Duration (ms)',
									id: 'duration',
									default: 0,
									min: 0,
									step: 10,
									max: 60000,
								},
								{
									type: 'checkbox',
									tooltip: 'This prevents the fader level from going above 0db (75%)',
									label: 'Limit fader to 0.0dB',
									id: 'faderLim',
									default: 0,
								},
							]
						)
					}
				}
			}
		}
	}

	for (const theStrip of defStrip) {
		let stripID = theStrip.id
		let chID = '/' + stripID
		let muteID = theStrip.muteID
		let fadeID = theStrip.fadeID
		let feedbackID = ''
		let d = theStrip.digits
		let muteChoice = [theStrip.hasOn ? '0' : '1', theStrip.hasOn ? '1' : '0', '2']
		let muteSfx = (theStrip.hasMix ? '/mix' : '') + (theStrip.hasOn ? '/on' : '')
		let fadeSfx = (theStrip.hasMix ? '/mix' : '') + (theStrip.hasOn ? '/fader' : '')
		let labelSfx = theStrip.hasOn ? '/config' : ''
		let defaultLabel = theStrip.label
		if (defaultLabel != '' && d > 0) {
			defaultLabel = defaultLabel + ' '
		}

		// strip process toggles

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
						const strip = p[0] == 'm' ? `/lr/${p[1]}/on` : `/rtn/aux/${p[1]}/on`
						const arg = {
							type: 'i',
							value: setToggle(self.xStat[strip].isOn, action.options.set),
						}
						self.sendOSC(strip, arg)
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
							const strip =
								action.actionId == 'lr' ? opt.type + nVal + '/mix/lr' : opt.type + nVal + '/' + action.actionId + '/on'
							const arg = {
								type: 'i',
								value: setToggle(self.xStat[strip].isOn, opt.set),
							}
							self.sendOSC(strip, arg)
						},
					}
				}
			}

			// console.log(`${chID}/${defProc[p].node} "${theStrip.description} ${defProc[p].desc}"`);
		}

		// channel mutes
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
							const opt = action.options
							const nVal = opt.type == '/ch/' ? pad0(opt.num) : opt.num
							let strip = opt.type + nVal
							if (opt.type == '/dca/') {
								strip += '/on'
							} else {
								strip += '/mix/on'
							}
							const arg = {
								type: 'i',
								value: setToggle(self.xStat[strip].isOn, opt.mute),
							}
							self.sendOSC(strip, arg)
						},
					}
				} else {
					// Main LR, Aux/USB
					muteActions[muteID] = {
						name: 'Mute ' + theStrip.description,
						options: [],
						callback: async (action, context) => {
							const strip = action.actionId == 'mMute' ? '/lr/mix/on' : '/rtn/aux/mix/on'
							const arg = {
								type: 'i',
								value: setToggle(self.xStat[strip].isOn, action.options.mute),
							}
							self.sendOSC(strip, arg)
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
						const strip = '/config/mute/' + opt.mute_grp
						const arg = {
							type: 'i',
							value: setToggle(self.xStat[strip].isOn, opt.mute),
						}
						self.sendOSC(strip, arg)
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

		if (!!fadeID) {
			makeLevelActions(fadeID, theStrip.description, chID + '/', theStrip)
		}

		// add channel type to send actions
		if (theStrip.hasLevel) {
			makeLevelActions('send', 'Send', chID + '/', theStrip)
		}

		if (d == 0) {
			let theID = chID + muteSfx
			feedbackID = unSlash(stripID)
			fbToStat[feedbackID] = theID
			stat[theID] = {
				isOn: false,
				hasOn: theStrip.hasOn,
				valid: false,
				fbID: feedbackID,
        fbSubs: new Set(),
				polled: 0,
			}
			// 'proc' routing toggles
			for (let p of theStrip.proc) {
				theID = `${chID}/${defProc[p].node}`
				feedbackID = `${unSlash(stripID)}_${p}`
				stat[theID] = {
					isOn: false,
					hasOn: true,
					valid: false,
					fbID: feedbackID,
          fbSubs: new Set(),
					polled: 0,
				}
				fbToStat[feedbackID] = theID
			}
			theID = chID + fadeSfx
			feedbackID = 'f_' + unSlash(stripID)
			fbToStat[feedbackID] = theID
			stat[theID] = {
				fader: 0.0,
				valid: false,
				fbID: feedbackID,
				fSteps: 1024,
				varID: feedbackID,
				polled: 0,
			}
			defVariables.push({
				name: theStrip.description + ' dB',
				variableId: feedbackID + '_d',
			})
			defVariables.push({
				name: theStrip.description + ' %',
				variableId: feedbackID + '_p',
			})
			defVariables.push({
				name: theStrip.description + ' % Relative Loudness',
				variableId: feedbackID + '_rp',
			})
			if ('' != labelSfx) {
				theID = chID + labelSfx + '/name'
				feedbackID = 'l_' + unSlash(stripID)
				fbToStat[feedbackID] = theID
				stat[theID] = {
					name: stripID,
					defaultName: defaultLabel,
					valid: false,
					fbID: feedbackID,
					polled: 0,
				}
				defVariables.push({
					name: theStrip.description + ' Label',
					variableId: feedbackID,
				})
				theID = chID + labelSfx + '/color'
				feedbackID = 'c_' + unSlash(stripID)
				fbToStat[feedbackID] = theID
				stat[theID] = {
					color: 0,
					valid: false,
					fbID: feedbackID,
					polled: 0,
				}
			}
			if (theStrip.hasLevel) {
				for (let b = 1; b < 11; b++) {
					let bOrF = b < 7 ? 'b' : 'f'
					let sChan = b < 7 ? b : b - 6
					theID = chID + '/mix/' + pad0(b) + '/level'
					let whichSend = b < 7 ? ' Bus ' + b : ' FX ' + (b - 6)
					feedbackID = 's_' + unSlash(stripID) + '_' + bOrF + sChan
					fbToStat[feedbackID] = theID
					stat[theID] = {
						level: 0.0,
						valid: false,
						fbID: feedbackID,
						fSteps: 161,
						varID: feedbackID,
						polled: 0,
					}
					defVariables.push({
						name: theStrip.description + ' ' + whichSend + ' dB',
						variableId: feedbackID + '_d',
					})
					defVariables.push({
						name: theStrip.description + ' ' + whichSend + ' %',
						variableId: feedbackID + '_p',
					})
					defVariables.push({
						name: theStrip.description + ' ' + whichSend + ' % Relative Loudness',
						variableId: feedbackID + '_rp',
					})
				}
			}
		} else {
			for (let c = theStrip.min; c <= theStrip.max; c++) {
				let theID = chID + '/' + pad0(c, d) + muteSfx
				let feedbackID = stripID + '_' + c
				fbToStat[feedbackID] = theID
				stat[theID] = {
					isOn: false,
					hasOn: theStrip.hasOn,
					valid: false,
					fbID: feedbackID,
					fbSubs: new Set(),
					polled: 0,
				}
				// 'proc' routing toggles
				for (const p of theStrip.proc) {
					theID = `${chID}/${pad0(c, d)}/${defProc[p].node}`
					//let fpID = `${unSlash(feedbackID)}_${p}`
					feedbackID = `${unSlash(stripID)}_${p}${c}`
					fbToStat[feedbackID] = theID
					stat[theID] = {
						isOn: false,
						hasOn: true,
						valid: false,
						fbID: feedbackID,
						fbSubs: new Set(),
						polled: 0,
					}
				}
				if ('' != fadeSfx) {
					theID = chID + '/' + pad0(c, d) + fadeSfx
					feedbackID = 'f_' + unSlash(stripID) + c
					fbToStat[feedbackID] = theID
					stat[theID] = {
						fader: 0.0,
						valid: false,
						fSteps: 1024,
						fbID: feedbackID,
						varID: feedbackID,
						polled: 0,
					}
					defVariables.push({
						name: theStrip.description + ' ' + c + ' dB',
						variableId: feedbackID + '_d',
					})
					defVariables.push({
						name: theStrip.description + ' ' + c + ' %',
						variableId: feedbackID + '_p',
					})
					defVariables.push({
						name: theStrip.description + ' ' + c + ' % Relative Loudness',
						variableId: feedbackID + '_rp',
					})
					if (theStrip.hasLevel) {
						for (let b = 1; b < 11; b++) {
							let bOrF = b < 7 ? 'b' : 'f'
							let sChan = b < 7 ? b : b - 6
							theID = chID + '/' + pad0(c, d) + '/mix/' + pad0(b) + '/level'
							let whichSend = b < 7 ? ' Bus ' + b : ' FX ' + (b - 6)
							feedbackID = 's_' + unSlash(stripID) + c + '_' + bOrF + sChan
							fbToStat[feedbackID] = theID
							stat[theID] = {
								level: 0.0,
								valid: false,
								fbID: feedbackID,
								fSteps: 161,
								varID: feedbackID,
								polled: 0,
							}
							defVariables.push({
								name: capFirst(stripID) + ' ' + c + whichSend + ' dB',
								variableId: feedbackID + '_d',
							})
							defVariables.push({
								name: capFirst(stripID) + ' ' + c + whichSend + ' %',
								variableId: feedbackID + '_p',
							})
							defVariables.push({
								name: capFirst(stripID) + ' ' + c + whichSend + ' % Relative Loudness',
								variableId: feedbackID + '_rp',
							})
						}
					}
				}
				if ('' != labelSfx) {
					theID = chID + '/' + pad0(c, d) + labelSfx + '/name'
					feedbackID = 'l_' + unSlash(stripID) + c
					fbToStat[feedbackID] = theID
					stat[theID] = {
						name: stripID + c,
						defaultName: defaultLabel + c,
						valid: false,
						fbID: feedbackID,
						polled: 0,
					}
					defVariables.push({
						name: theStrip.description + ' ' + c + ' Label',
						variableId: feedbackID,
					})
					theID = chID + '/' + pad0(c, d) + labelSfx + '/color'
					feedbackID = 'c_' + unSlash(stripID) + c
					fbToStat[feedbackID] = theID
					stat[theID] = {
						color: 0,
						valid: false,
						fbID: feedbackID,
						polled: 0,
					}
				}
			}
		}

		// mute feedback defs
		let fbDescription = theStrip.description + ' ' + (theStrip.hasOn ? 'Mute' : '') + ' status'
		muteFeedbacks[stripID] = {
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
			subscribe: async (feedback, context) => {
				const theChannel = feedback.options.theChannel
				const fbWhich = feedback.feedbackId
				if (theChannel) {
					self.xStat[self.fbToStat[fbWhich + '_' + theChannel]].fbSubs.add(feedback.id)
				}
			},
			unsubscribe: async (feedback, context) => {
				const theChannel = feedback.options.theChannel
				const fbWhich = feedback.feedbackId
				if (theChannel) {
					self.xStat[self.fbToStat[fbWhich + '_' + theChannel]].fbSubs.delete(feedback.id)
				}
			},
			callback: async (feedback, context) => {
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
			muteFeedbacks[stripID].options.push({
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
		// 'proc' routing feedback toggles
		for (let p of theStrip.proc) {
			fbDescription = `${theStrip.description} ${defProc[p].desc} status`
			let feedbackID = `${unSlash(stripID)}_${p}`
			muteFeedbacks[feedbackID] = {
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
				callback: async (feedback, context) => {
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
				muteFeedbacks[feedbackID].options.push({
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
			let cID = 'c_' + unSlash(stripID)
			colorFeedbacks[cID] = {
				type: 'advanced',
				name: 'Color of ' + fbDescription,
				description: 'Use button colors from ' + fbDescription,
				options: [],
				callback: async (feedback, context) => {
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
	//Object.assign(self.actionDefs, fadeActions)
	Object.assign(self.actionDefs, levelActions, muteActions, procActions) //, storeActions)
	Object.assign(self.muteFeedbacks, muteFeedbacks)
	Object.assign(self.colorFeedbacks, colorFeedbacks)
	self.variableDefs.push(...defVariables)
}
