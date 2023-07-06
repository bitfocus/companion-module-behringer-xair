import { combineRgb, InstanceStatus } from '@companion-module/base'
import { pad0, unSlash, setToggle, fadeTo } from './helpers.js'
import { ICON_SOLO } from './icons.js'
import { defSolo } from './defSolo.js'

// build solo actions/feedbacks/variables
// injects results to the base module via self
export function buildSoloDefs(self) {
	// var c, i, ch, cm, cMap, id, actID, soloID, cmd, pfx

	let stat = {}
	let soloFbToStat = {}
	let soloActions = {}
	let soloFeedbacks = {}
	let soloVariables = []
	let soloOffset = {}

	function soloLabel(d, min, max) {
		return d + (0 == max - min ? '' : ' (' + min + '-' + max + ')')
	}

	for (const cmd of defSolo) {
		const pfx = cmd.prefix
		const cMap = cmd.cmdMap
		switch (cmd.id) {
			case 'solosw':
				for (const cm in cmd.cmdMap) {
					const ch = cMap[cm]
					const soloID = cmd.id + '_' + ch.actID
					soloOffset[soloID] = ch.offset
					// solo action definitions
					soloActions[soloID] = {
						name: soloLabel('Solo ' + ch.description, ch.min, ch.max),
						options: [],
					}
					if (ch.min == ch.max) {
						let c = pad0(ch.min + ch.offset)
						soloFbToStat[soloID] = pfx + c
						stat[pfx + c] = {
							fbID: soloID, //+ '_' + c,
							valid: false,
							polled: 0,
							hasOn: true,
							isOn: false,
						}
					} else {
						for (let i = ch.min; i <= ch.max; i++) {
							let c = pad0(i + ch.offset)
							soloFbToStat[soloID + i] = pfx + c
							stat[pfx + c] = {
								fbID: soloID, // + '_' + c,
								valid: false,
								polled: 0,
								hasOn: true,
								isOn: false,
							}
						}
						soloActions[soloID].options.push({
							type: 'number',
							label: ch.description,
							id: 'num',
							default: 1,
							min: ch.min,
							max: ch.max,
							range: false,
							required: true,
						})
					}
					soloActions[soloID].options.push({
						type: 'dropdown',
						label: 'Solo',
						id: 'solo',
						default: '2',
						choices: [
							{ id: '1', label: 'On' },
							{ id: '0', label: 'Off' },
							{ id: '2', label: 'Toggle' },
						],
					})
					soloActions[soloID].callback = async (action, context) => {
						const opt = action.options
						let nVal = opt.num ? opt.num : 1
						let strip = '/-stat/solosw/' + pad0(self.soloOffset[action.actionId] + nVal)
						let arg = {
							type: 'i',
							value: setToggle(self.xStat[strip].isOn, opt.solo),
						}
						await self.sendOSC(strip, arg)
					}
					// solo feedback defs
					const fbDescription = 'Solo ' + ch.description + ' status'
					soloFeedbacks[soloID] = {
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
							bgcolor: combineRgb(0, 0, 0),
							png64: ICON_SOLO,
						},
						callback: function (feedback, context) {
							let theChannel = feedback.options.theChannel
							let fbWhich = feedback.feedbackId
							let state = feedback.options.state != '0'
							let stat

							if (theChannel) {
								stat = self.xStat[self.fbToStat[fbWhich + theChannel]]
							} else if (self.fbToStat[fbWhich]) {
								stat = self.xStat[self.fbToStat[fbWhich]]
							}
							return stat.isOn == state
						},
					}
					if (ch.min != ch.max) {
						soloFeedbacks[soloID].options.push({
							type: 'number',
							label: ch.description + ' number',
							id: 'theChannel',
							default: 1,
							min: ch.min,
							max: ch.max,
							range: false,
							required: true,
						})
					}
				}
				break
			case 'config':
				for (const ch of cMap) {
					const actID = 'solo_' + ch.actID
					const soloID = 'f_solo'
					const c = pfx + ch.actID
					stat[c] = {
						fbID: actID,
						varID: soloID,
						valid: false,
						polled: 0,
					}
					soloFbToStat[actID] = c
					if (ch.isFader) {
						let fbDescription = 'Solo ' + ch.description
						for (let sfx of ['', '_a']) {
							const aId = actID + sfx
							soloActions[aId] = {
								name: fbDescription + ('' == sfx ? ' Set' : ' Adjust'),
								options: [],
							}
							switch (sfx) {
								case '':
									soloActions[aId].options.push({
										type: 'dropdown',
										label: 'Level',
										id: 'fad',
										default: '0.0',
										choices: self.FADER_VALUES,
									})
									break
								case '_a':
									soloActions[aId].options.push({
										type: 'number',
										tooltip: 'Move fader +/- percent.\nFader Percent:\n0 = -oo, 75 = 0db, 100 = +10db',
										label: 'Adjust',
										id: 'ticks',
										min: -100,
										max: 100,
										default: 1,
									})
							}
							soloActions[aId].options.push({
								type: 'checkbox',
								tooltip: 'This prevents the fader level from going above 0db (75%)',
								label: 'Limit fader to 0.0dB',
								id: 'faderLim',
								default: 0,
							})
							soloActions[aId].callback = async (action, context) => {
								const opt = action.options
								let strip = '/config/solo/level'
								let fVal = await fadeTo(action.actionId, strip, opt, self)
								if (fVal >= 0) {
									let arg = {
										type: 'f',
										value: fVal,
									}
									await self.sendOSC(strip, arg)
								}
							}
						}

						stat[c].fader = 0
						stat[c].fSteps = 161
						soloVariables.push({
							name: fbDescription + ' dB',
							variableId: soloID + '_d',
						})
						soloVariables.push({
							name: fbDescription + ' %',
							variableId: soloID + '_p',
						})
						soloVariables.push({
							name: fbDescription + ' % Relative Loudness',
							variableId: soloID + '_rp',
						})
					} else {
						soloActions[actID] = {
							name: 'Solo ' + ch.description,
							options: [],
							callback: async (action, context) => {
								let strip = `${c}`
								let arg = { type: 'i', value: setToggle(self.xStat[strip].isOn, action.options.set) }
								await self.sendOSC(strip, arg)
							},
						}
						soloActions[actID].options.push({
							type: 'dropdown',
							label: 'Value',
							id: 'set',
							default: '2',
							choices: [
								{ id: '1', label: 'On' },
								{ id: '0', label: 'Off' },
								{ id: '2', label: 'Toggle' },
							],
						})
						soloActions[actID]
						stat[c].isOn = false
						let fbDescription = 'Solo ' + ch.description + ' status'
						soloFeedbacks[actID] = {
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
								bgcolor: combineRgb.apply(this, ch.bg),
							},
							callback: function (feedback, context) {
								var fbWhich = feedback.feedbackId
								var stat = self.xStat[self.fbToStat[fbWhich]]
								var state = feedback.options.state != '0'

								return stat.isOn == state
							},
						}
					}
				}
				break
			case 'action':
				for (const ch of cMap) {
					const actID = ch.actID
					const soloID = ch.statID
					soloActions[actID] = {
						name: ch.description,
						description: ch.description,
						options: [],
						callback: async (action, context) => {
							self.sendOSC('/-action/clearsolo', { type: 'i', value: 1 })
						},
					}
					stat[soloID] = {
						fbID: actID,
						valid: false,
						polled: 0,
					}
					soloFbToStat[actID] = soloID
					if (!ch.hasFader) {
						stat[soloID].isOn = false
						soloFeedbacks[actID] = {
							type: 'advanced',
							name: ch.statDesc,
							description: 'Color when ' + ch.statDesc,
							options: [
								{
									type: 'checkbox',
									label: 'Blink?',
									id: 'blink',
									default: 1,
								},
								{
									type: 'colorpicker',
									label: 'Foreground color',
									id: 'fg',
									default: 0,
								},
								{
									type: 'colorpicker',
									label: 'Background color',
									id: 'bg',
									default: combineRgb(...ch.bg),
								},
							],
							callback: function (feedback, context) {
								let opt = feedback.options
								let fbWhich = feedback.feedbackId
								let fbStat = self.xStat[self.fbToStat[fbWhich]]
								let d = Date(Date.now())

								if (fbStat.isOn) {
									if (opt.blink) {
										self.blinkingFB[fbStat.fbID] = true
										if (!self.blinkOn) {
											return
										}
									}
									return { color: opt.fg, bgcolor: opt.bg }
								} else {
									delete self.blinkingFB[fbStat.fbID]
								}
							},
						}
					}
				}
				break
		}
	}
	self.soloOffset = soloOffset
	Object.assign(self.xStat, stat)
	Object.assign(self.fbToStat, soloFbToStat)
	Object.assign(self.actionDefs, soloActions)
	Object.assign(self.muteFeedbacks, soloFeedbacks)
	self.variableDefs.push(...soloVariables)
}
