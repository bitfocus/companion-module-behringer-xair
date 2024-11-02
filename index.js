/* eslint-disable no-useless-escape */
import OSC from 'osc'
import { combineRgb, Regex, TCPHelper } from '@companion-module/base'
import { runEntrypoint, InstanceBase, InstanceStatus } from '@companion-module/base'
import { UpgradeScripts } from './upgrades.js'
import { buildConstants } from './constants.js'
import { buildStripDefs } from './buildStripDefs.js'
import { buildSoloDefs } from './buildSoloDefs.js'
import { buildStaticActions } from './actions.js'
import { buildSnapshotDefs } from './buildSnapshotDefs.js'
import { buildMeterDefs } from './buildMeterDefs.js'
import { buildHADefs } from './buildHADefs.js'
import { getConfigFields } from './config.js'
import { ICON_SOLO } from './icons.js'
import { pad0 } from './helpers.js'

class BAirInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		// stat id from mixer address
		this.fbToStat = {}
		this.fbToMeter = {}

		this.soloOffset = {}
		this.actionDefs = {}
		this.haActionDefs = {}
		this.muteFeedbacks = {}
		this.meterFeedbacks = {}
		this.colorFeedbacks = {}
		this.variableDefs = []
		this.fLevels = {}
		this.blinkingFB = {}
		this.crossFades = {}
		this.unitsFound = {}

		this.PollCount = 30
		this.PollTimeout = 25
		this.getConfigFields = getConfigFields

		buildConstants(this)
	}

	async init(config) {
		this.config = config

		if (!this.config.model) {
			this.config.model = 'X18'
		}

		if (!this.config.channels) {
			this.config.channels = parseInt(this.config.model.replace(/\D/g, ''))
			this.saveConfig(this.config)
		}
		this.snapshot = []

		this.currentSnapshot = 0
		this.prevSnapshot = 0
		this.nextSnapshot = 0

		this.myMixer = {
			name: '',
			model: '',
			channels: 0,
			ip: '',
			fwVersion: '',
		}

		// mixer state
		this.xStat = {}
		// meters
		this.mStat = {}

		// level/fader value store
		this.tempStore = {}

		// cross-fade steps per second
		this.fadeResolution = 20
		this.needStats = true
		this.hostResponse = false
		this.blinkOn = false

		this.unitsFound = {}
		if (config.scan) {
			// quick moment to pre-scan
			this.scanForMixers()
		}
		buildStripDefs(this)
		buildSoloDefs(this)
		buildStaticActions(this)
		buildSnapshotDefs(this)
		buildMeterDefs(this)
		buildHADefs(this)

		//buildHeadampDefs(this)
		this.setActionDefinitions(this.actionDefs)
		this.buildStaticFeedbacks(this)
		this.buildStaticVariables()
		this.buildPresets()
		this.init_osc()
		this.totalVars = Object.keys(this.xStat).length
		this.log('debug', `${this.totalVars} status addresses`)
	}

	async configUpdated(config) {
		// a bit more processing than available in
		// an upgrade script :)
		if ('' == config.host) {
			let u = this.unitsFound[config.mixer]
			if (u) {
				config.host = u
				this.saveConfig(config)
			}
		}
		// do we have a name for this host?
		if (config.scan) {
			if (!('' == config.mixer || 'none' == config.mixer) && Object.keys(this.unitsFound).length > 0) {
				for (let m in this.unitsFound) {
					if (this.unitsFound[m].m_ip == config.host) {
						config.mixer = m
						config.model = this.unitsFound[m].m_model
						config.channels = this.unitsFound[m].m_channels
					}
				}
				this.saveConfig(config)
			}
			if (config.mixer in this.unitsFound) {
				if (config.host != this.unitsFound[config.mixer].m_ip) {
					config.host = this.unitsFound[config.mixer].m_ip
					this.saveConfig(config)
				}
			}
		}
		await this.destroy() // re-start all connections in case host changed.
		await this.init(config)
	}

	// When module gets deleted
	async destroy() {
		if (this.heartbeat) {
			clearInterval(this.heartbeat)
			delete this.heartbeat
		}
		if (this.blinker) {
			clearInterval(this.blinker)
			delete this.blinker
		}
		if (this.fader) {
			clearInterval(this.fader)
			delete this.fader
		}
		if (this.oscPort) {
			this.oscPort.close()
			delete this.oscPort
		}
		if (this.scanner) {
			clearInterval(this.scanner)
			delete this.scanner
		}
		if (this.scanPort) {
			this.scanPort.close()
			delete this.scanport
		}
	}

	/**
	 * heartbeat to request updates, subscription expires every 10 seconds
	 */
	pulse() {
		this.sendOSC('/xremote', [])
		// subscribe for meter data
		this.sendOSC('/-local/updrate', [{ type: 'i', value: 1 }])
		this.sendOSC('/meters', [
			{ type: 's', value: '/meters/1' },
			{ type: 'i', value: 0 },
		])
		// any leftover status needed?
		if (this.needStats) {
			this.pollStats()
		}
	}

	/**
	 * feedback blinker (1 sec interval)
	 */
	blink() {
		// toggle 'blinker'
		this.blinkOn = !this.blinkOn
		this.checkFeedbacks(...Object.keys(this.blinkingFB))
	}

	/**
	 *
	 * network scanner interval
	 */
	probe() {
		if (!(this.probeCount % 6)) {
			// scan every 30 seconds
			this.scanPort.send(
				{
					address: '/xinfo',
					args: [],
				},
				'255.255.255.255',
				10024
			)
		}
		this.probeCount++
	}

	/**
	 * Gather list of local mixer IP numbers and names
	 */
	async scanForMixers() {
		let uPort = this.scanPort

		if (!this.scanPort) {
			uPort = this.scanPort = new OSC.UDPPort({
				localAddress: '0.0.0.0',
				localPort: 0,
				broadcast: true,
				metadata: true,
			})
		}

		this.scanPort.on('error', (err) => {
			this.log('error', 'XAir scan: ' + err.message)
			this.probeCount = 0 // reset to check every 5 secs
			this.updateStatus(InstanceStatus.UnknownError, err.message)
		})

		uPort.open()

		// When the port is read, send an OSC message to, say, SuperCollider
		uPort.on('ready', () => {
			this.probeCount = 0
			this.probe()
			if (this.scanner != undefined) {
				clearInterval(this.scanner)
				delete this.scanner
			}
			this.scanner = setInterval(() => {
				this.probe()
			}, 5000)
		})

		uPort.on('message', (oscMsg, timeTag, info) => {
			if ('/xinfo' == oscMsg.address) {
				let args = oscMsg.args
				let newUnit = {
					m_ip: args[0].value,
					m_name: args[1].value,
					m_model: args[2].value,
					m_fwver: args[3].value,
					m_channels: parseInt(args[2].value.match(/\d+/)[0]),
					m_last: Date.now(),
				}
				this.unitsFound[newUnit.m_name] = newUnit
				if (!this.config.mixer || this.config.mixer == '') {
					if (newUnit.m_ip == this.config.host) {
						this.config.mixer = newUnit.m_name
						this.config.model = newUnit.m_model
						this.config.channels = newUnit.m_channels
						this.saveConfig(this.config)
					}
				}
				for (let u in this.unitsFound) {
					// remove from list if not seen in last 10 minutes
					if (Date.now() - this.unitsFound[u].m_last > 600000) {
						delete this.unitsFound[u]
					}
				}
			}
		})
	}

	/**
	 * timed fades
	 */
	doFades() {
		let arg = { type: 'f' }
		let fadeDone = []

		for (let f in this.crossFades) {
			let c = this.crossFades[f]
			c.atStep++
			let atStep = c.atStep
			let newVal = c.startVal + c.delta * atStep

			arg.value = Math.sign(c.delta) > 0 ? Math.min(c.finalVal, newVal) : Math.max(c.finalVal, newVal)

			this.sendOSC(f, arg)

			if (atStep > c.steps) {
				fadeDone.push(f)
			}
		}

		// delete completed fades
		for (let f of fadeDone) {
			delete this.crossFades[f]
		}
	}

	buildPresets() {
		const presets = {}

		presets['chan_fb'] = {
			type: 'button',
			category: 'Channel',
			name: 'Channel 1 Label\nIncludes Label, Color, Mute toggle, Mute feedback, Solo feedback',
			style: {
				text: '$(xair:l_ch1)',
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: 0,
			},
			steps: [
				{
					down: [
						{
							actionId: 'mute',
							options: {
								type: '/ch/',
								num: 1,
								mute: 2,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'c_ch',
					options: {
						theChannel: 1,
					},
				},
				{
					feedbackId: 'ch',
					options: {
						theChannel: 1,
						state: 1,
					},
					style: {
						color: 16777215,
						bgcolor: combineRgb(128, 0, 0),
					},
				},
				{
					feedbackId: 'solosw_ch',
					options: {
						theChannel: 1,
						state: '1',
					},
					style: {
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
						png64: ICON_SOLO,
					},
				},
			],
		}

		presets['chan_lvl'] = {
			type: 'button',
			category: 'Channel',
			name: 'Channel 1 Level\nIncludes Fader dB, Color, Solo toggle, Solo feedback',
			style: {
				text: '$(xair:f_ch1_d)',
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: 0,
			},
			steps: [
				{
					down: [
						{
							actionId: 'solosw_ch',
							options: {
								num: 1,
								solo: 2,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'c_ch',
					options: {
						theChannel: 1,
					},
				},
				{
					feedbackId: 'solosw_ch',
					options: {
						theChannel: 1,
						state: 1,
					},
					style: {
						color: combineRgb(255, 255, 255),
						bgcolor: combineRgb(0, 0, 0),
						png64: ICON_SOLO,
					},
				},
			],
		}
		presets['rude'] = {
			type: 'button',
			category: 'Status',
			name: 'Rude Solo Button\nBlinks if any solo is on\nPush to clear all solos',
			style: {
				text: 'All Solo Clear',
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: 0,
			},
			steps: [
				{
					down: [
						{
							actionId: 'clearsolo',
							options: {},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'clearsolo',
					options: {
						blink: 1,
						fg: combineRgb(255, 255, 255),
						bg: combineRgb(255, 0, 0),
					},
				},
			],
		}

		this.setPresetDefinitions(presets)
	}

	pollStats() {
		let stillNeed = false
		let counter = 0
		let timeNow = Date.now()
		let timeOut = timeNow - this.PollTimeout

		for (const id in this.xStat) {
			if (!this.xStat[id].valid) {
				stillNeed = true
				if (this.xStat[id].polled < timeOut) {
					this.sendOSC(id)
					// this.log('debug', `sending ${id}`)
					this.xStat[id].polled = timeNow
					counter++
					// only allow 'PollCount' queries during one cycle
					if (counter > this.PollCount) {
						break
					}
				}
			}
		}

		if (!this.hostResponse && stillNeed && timeNow - this.timeStart > 10000) {
			this.log('error', `${this.config.host} not responding`)
			this.updateStatus(InstanceStatus.ConnectionFailure, `${this.config.host} not responding`)
			if (this.config.scan && this.unitsFound[this.config.mixer] !== undefined) {
				if (this.config.host != this.unitsFound[this.config.mixer]) {
					this.log('warn', `Resetting IP for ${this.config.mixer}`)
					this.config.host = this.unitsFound[this.config.mixer].m_ip
					this.saveConfig(this.config)
					this.destroy()
					this.init(this.config)
				}
			}
			return
		}

		if (!stillNeed) {
			this.updateStatus(InstanceStatus.Ok, 'Console status loaded')
			const c = Object.keys(this.xStat).length
			const d = (c / ((timeNow - this.timeStart) / 1000)).toFixed(1)
			this.log('info', `Status Sync complete (${c}@${d})`)
		}
		this.needStats = stillNeed
	}

	firstPoll() {
		this.sendOSC('/xinfo', [])
		this.sendOSC('/-snap/index', [])
		this.sendOSC('/-snap/name', [])
		this.timeStart = Date.now()
		this.pollStats()
		this.pulse()
	}

	/**
	 * Calculate linear fader value (0..1) for a given 'step'
	 * 	depending on total 'steps'
	 * @param {integer} i - which step
	 * @param {integer} steps - number of steps for this fader parameter
	 * @returns {float}
	 */
	stepsToFader(i, steps) {
		let res = i / (steps - 1)

		return Math.floor(res * 10000) / 10000
	}

	/**
	 * Calculate logarithmic fader value (0..1) for a given 'step'
	 * 	depending on total 'steps'
	 * @param {integer} i - which step
	 * @param {integer} steps - number of steps for this fader parameter
	 * @returns {float}
	 */
	logFaderToDB(f, steps) {
		let res = i / (steps - 1)

		return Math.floor((fmin * exp(log(fmax / fmin) * f)) / 10000)
	}

	faderToDB(f, steps, rp) {
		// “f” represents OSC float data. f: [0.0, 1.0]
		// “d” represents the dB float data. d:[-oo, +10]
		// if "rp" (Relative percent) is true, return a loudness perceptual (base 10/33.22) change in % compared to unity (0dB)
		let d = 0

		if (f >= 0.5) {
			d = f * 40.0 - 30.0 // max dB value: +10.
		} else if (f >= 0.25) {
			d = f * 80.0 - 50.0
		} else if (f >= 0.0625) {
			d = f * 160.0 - 70.0
		} else if (f >= 0.0) {
			d = f * 480.0 - 90.0 // min dB value: -90 or -oo
		}
		return f == 0
			? rp
				? '0'
				: '-oo'
			: (rp ? '' : d > 0 ? '+' : '') + (rp ? 100 * 10 ** (d / 33.22) : Math.round(d * 1023.5) / 1024).toFixed(1)
	}

	init_osc() {
		let self = this

		if (this.oscPort) {
			this.oscPort.close()
		}
		// no host or still default '0.0.0.0'
		if (!this.config.host || this.config.host.split('.').reduce((acc, b) => acc + b, 0) == 0) {
			this.updateStatus(InstanceStatus.ConnectionFailure, 'No host IP')
		} else {
			//		if (this.config.host) {
			this.oscPort = new OSC.UDPPort({
				localAddress: '0.0.0.0',
				localPort: 0, // random local port
				remoteAddress: this.config.host,
				remotePort: 10024,
				metadata: true,
			})

			// listen for incoming messages
			this.oscPort.on('message', (message, timeTag, info) => {
				const args = message.args
				const node = message.address
				const leaf = node.split('/').pop()
				const top = node.split('/')[1]
				this.hostResponse = true

				if ('meters' != top) {
					this.log('debug', `received ${node}:` + JSON.stringify(args) + ` from ${info.address}`)
				}
				if (this.xStat[node] !== undefined) {
					let v = args[0].value
					switch (leaf) {
						case 'on':
						case 'lr':
						case '1':
						case '2':
						case '3':
						case '4': // '/config/mute/#'
							this.xStat[node].isOn = !!v
							const fbSubs = this.xStat[node].fbSubs
							if (fbSubs?.size > 0) {
								this.checkFeedbacksById(...fbSubs)
							} else {
								this.checkFeedbacks(this.xStat[node].fbID)
							}
							break

						// this.xStat[node].isOn = !!v
						// this.checkFeedbacks(this.xStat[node].fbID)
						// break
						case 'fader':
						case 'level':
							v = Math.floor(v * 10000) / 10000
							this.xStat[node][leaf] = v
							this.setVariableValues({
								[this.xStat[node].varID + '_p']: Math.round(v * 100),
								[this.xStat[node].varID + '_d']: this.faderToDB(v, 1024, false),
								[this.xStat[node].varID + '_rp']: Math.round(this.faderToDB(v, 1024, true)),
							})
							this.xStat[node].idx = this.fLevels[this.xStat[node].fSteps].findIndex((i) => i >= v)
							break
						case 'pan':
							v = Math.floor(v * 10000) / 10000
							this.xStat[node].pan = v
							this.setVariableValues({
								[this.xStat[node].varID]: Math.round(v * 200 - 100),
							})
							this.xStat[node].idx = this.fLevels[this.xStat[node].fSteps].findIndex((i) => i >= v)
							break
						case 'gain': // headamp
							let ha = parseInt(node.split('/')[2])
							this.xStat[node].gain = v
							this.setVariableValues({
								[this.xStat[node].varID + '_p']: Math.round(v * 100),
								[this.xStat[node].varID + '_d']: this.faderToDB(
									v,
									this.HA_CONFIG[ha][this.myMixer.channels].trim,
									false
								),
							})
							break
						case 'phantom':
							this.xStat[node].pp = !!v
							this.setVariableValues({
								[this.xStat[node].varID]: !!v,
							})
							break
						case 'source':
							this.xStat[node].m_source = v
							this.setVariableValues({
								[this.xStat[node].varID]: this.MONITOR_SOURCES[v].label,
							})
							this.checkFeedbacks(this.xStat[node].fbID)
							break
						case 'chmode':
						case 'busmode':
							this.xStat[node].value = !!v ? 'AFL' : 'PFL'
							this.setVariableValues({
								[this.xStat[node].varID]: this.xStat[node].value,
							})
							break
						case 'name':
							// no name, use behringer default
							v = v == '' ? this.xStat[node].defaultName : v
							this.xStat[node].name = v
							this.setVariableValues({ [this.xStat[node].fbID]: v })
							if ('-snap' == top) {
								let num = parseInt(node.split('/')[2])
								if (num == this.currentSnapshot) {
									this.setVariableValues({ s_name: v })
								} else if (num == this.prevSnapshot) {
									this.setVariableValues({ s_name_p: v })
								} else if (num == this.nextSnapshot) {
									this.setVariableValues({ s_name_n: v })
								}
							}
							break
						case 'color':
							this.xStat[node].color = v
							this.checkFeedbacks(this.xStat[node].fbID)
							break
						case 'dimpfl':
						case 'mono':
						case 'dim':
						case 'mute': // '/config/solo/'
							this.xStat[node].isOn = !!v
							this.checkFeedbacks(this.xStat[node].fbID)
							this.setVariableValues({ [this.xStat[node].varID]: v ? true : false })
							break

						default:
							if (node.match(/\/solo/)) {
								this.xStat[node].isOn = v
								this.checkFeedbacks(this.xStat[node].fbID)
							}
					}
					this.xStat[node].valid = true
					if (this.needStats) {
						this.pollStats()
					}
					// this.log('debug',`${node}: ${JSON.stringify(args)}`);
				} else if ('xinfo' == top) {
					this.myMixer.name = args[1].value
					this.myMixer.model = args[2].value
					this.myMixer.channels = parseInt(args[2].value.match(/\d+/)[0])
					this.myMixer.fw = args[3].value
					this.myMixer.ip = args[0].value
					this.setVariableValues({
						m_name: this.myMixer.name,
						m_model: this.myMixer.model,
						m_channels: this.myMixer.channels,
						m_fw: this.myMixer.fw,
						m_ip: this.myMixer.ip,
					})
				} else if ('/-snap/index' == node) {
					const s = parseInt(args[0].value)
					const n = this.xStat[this.snapshot[s]].name
					this.currentSnapshot = s
					this.setVariableValues({
						s_index: s,
						s_name: n,
						['s_name_' + pad0(s)]: n,
					})
					this.prevSnapshot = 1 >= s ? 0 : s - 1
					this.nextSnapshot = 64 <= s ? 0 : s + 1
					this.setVariableValues({
						s_name_p: this.xStat[this.snapshot[this.prevSnapshot]]?.name ?? '-----',
						s_name_n: this.xStat[this.snapshot[this.nextSnapshot]]?.name ?? '-----',
					})
					this.checkFeedbacks('snap_color')
					this.sendOSC('/-snap/' + pad0(s) + '/name', [])
				} else if ('meters' == top) {
					// meters here
					switch (leaf) {
						case '1':
							this.parseMeters1(args[0].value)
							break
					}
					if ('meters' != top) {
						this.log('debug', message.address, args)
					}
				}
			})

			this.oscPort.on('ready', () => {
				this.updateStatus(InstanceStatus.Connecting, 'Loading console status')
				this.Connected = true
				this.log('info', 'Sync started')
				this.firstPoll()
				this.heartbeat = setInterval(() => {
					this.pulse()
				}, 9500) // just before 10 sec expiration
				this.blinker = setInterval(() => {
					this.blink()
				}, 1000)
				this.fader = setInterval(() => {
					this.doFades()
				}, 1000 / this.fadeResolution)
			})

			this.oscPort.on('close', () => {
				this.connected = false
				if (this.heartbeat) {
					clearInterval(this.heartbeat)
					delete this.heartbeat
				}
				if (this.blinker) {
					clearInterval(this.blinker)
					delete this.blinker
				}
				if (this.fader) {
					clearInterval(this.fader)
					delete this.fader
				}
			})

			this.oscPort.on('error', (err) => {
				this.log('error', 'Error: ' + err.message)
				this.updateStatus(InstanceStatus.UnknownError, err.message)
				this.connected = false
				if (this.heartbeat) {
					clearInterval(this.heartbeat)
					delete this.heartbeat
				}
				if (this.blinker) {
					clearInterval(this.blinker)
					delete this.blinker
				}
				if (this.fader) {
					clearInterval(this.fader)
					delete this.fader
				}
			})

			this.oscPort.open()
		}
	}

	parseMeters1(buf) {
		if (buf[0] != 40) return

		// if (this.lastMeter && Date.now() - this.lastMeter < 50) {
		// 	return
		// }
		let data = new DataView(buf.slice(4).buffer)

		let variables = {}
		let feedbacks = []

		for (let i = 0; i < 40; i++) {
			const m = this.meter1[i]
			let newVal = data.getInt16(i * 2, true) / 256
			const mv = this.mStat[m]
			let total = mv.total
			const oldVal = mv.dbVal
			mv.valid = true
			mv.dbVal = newVal
			if (mv.fbSubs.size > 0 && newVal != oldVal) {
				this.checkFeedbacksById(...mv.fbSubs)
			}
			mv.count = ++mv.count % 10
			total -= mv.samples[mv.count]
			mv.samples[mv.count] = newVal
			total += newVal
			mv.total = total
			if (this.lastMeter && Date.now() - this.lastMeter > 50) {
				variables[mv.vName] = Math.max(Math.round(total) / 10, -60.0)
			}
		}
		this.setVariableValues(variables)
		this.lastMeter = Date.now()
	}

	// define static instance variables
	buildStaticVariables() {
		const variables = [
			{
				name: 'XAir Mixer Name',
				variableId: 'm_name',
			},
			{
				name: 'XAir Mixer Model',
				variableId: 'm_model',
			},
			{
				name: 'XAir Mixer Firmware',
				variableId: 'm_fw',
			},
			{
				name: 'XAir Mixer IP Address',
				variableId: 'm_ip',
			},
			{
				name: 'XAir Mixer Channels',
				variableId: 'm_channels',
			},
			{
				name: 'Current Snapshot Name',
				variableId: 's_name',
			},
			{
				name: 'Current Snapshot Index',
				variableId: 's_index',
			},
			{
				name: 'Previous Snapshot Name',
				variableId: 's_name_p',
			},
			{
				name: 'Next Snapshot Name',
				variableId: 's_name_n',
			},
		]
		variables.push.apply(variables, this.variableDefs)

		this.setVariableDefinitions(variables)
	}

	// define instance feedbacks
	buildStaticFeedbacks(self) {
		const feedbacks = {
			snap_color: {
				type: 'boolean',
				name: 'Is Current Snapshot',
				description: 'Indicate on button when snapshot is loaded',
				options: [
					{
						type: 'textinput',
						label: 'Snapshot to match',
						id: 'theSnap',
						default: '1',
						required: true,
						useVariables: true,
					},
				],
				defaultStyle: {
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(0, 128, 0),
				},

				callback: async (feedback, context) => {
					try {
						const snap = parseInt(await context.parseVariablesInString(feedback.options.theSnap))

						if (snap < 1 || snap > 64) {
							const err = [feedback.controlId, feedback.feedbackId, 'Invalid Snapshot #'].join(' → ')
							this.updateStatus(InstanceStatus.BadConfig, err)
							this.paramError = true
						} else {
							return snap == this.currentSnapshot
						}
					} finally {
					}
				},
			},
		}
		Object.assign(feedbacks, this.muteFeedbacks)
		Object.assign(feedbacks, this.colorFeedbacks)
		Object.assign(feedbacks, this.meterFeedbacks)
		this.setFeedbackDefinitions(feedbacks)
	}

	async sendOSC(node, arg) {
		arg = arg ?? []

		if (this.oscPort) {
			this.log('debug', `OSC > ${node}:` + JSON.stringify(arg))
			this.oscPort.send({
				address: node,
				args: arg,
			})
		}
	}
}

runEntrypoint(BAirInstance, UpgradeScripts)
