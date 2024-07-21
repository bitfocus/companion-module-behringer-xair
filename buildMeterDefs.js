import { combineRgb } from '@companion-module/base'
import { pad0, unSlash } from './helpers.js'
import { graphics } from 'companion-module-utils'

export function buildMeterDefs(self) {
	let stat = {}
	let fbToMeter = {}
	let feedbacks = {}
	let variables = []
	let stripType = [
		{
			id: 'ch',
			label: 'Channel 1-16',
		},
		{
			id: 'aux',
			label: 'USB / Aux',
		},
		{
			id: 'rtn',
			label: 'FX Return (1-4)',
		},
		{
			id: 'bus',
			label: 'Bus (1-6)',
		},
		{
			id: 'fx',
			label: 'FX Send (1-4)',
		},
		{
			id: 'lr',
			label: 'Main Out',
		},
		{
			id: 'mon',
			label: 'Monitor Out',
		},
	]

	let meter1 = new Array(40)

	// meter1
	for (let i = 0; i < 40; i++) {
		let channelID = ''
		let feedbackID = ''
		let muteFeedbackID = ''
    let meterFBID = ''
		let variableID = ''
		let n = ''

		if (i < 16) {
			channelID = `ch/${pad0(i + 1)}`
			variableID = `ch${i + 1}`
			feedbackID = muteFeedbackID = `ch_${i + 1}`
			n = `Channel ${i + 1}`
		} else {
			if (i < 26) {
				let m = parseInt((i - 16) / 2)
				channelID = ['rtn/aux', 'rtn_1', 'rtn_2', 'rtn_3', 'rtn_4'][m]
				feedbackID = muteFeedbackID = unSlash(channelID.split('_').join(''))
				channelID += i % 2 ? '_r' : '_l'
				variableID = feedbackID += i % 2 ? '_r' : '_l'
				n = ['Aux', 'Return 1', 'Return 2', 'Return 3', 'Return 4'][m]
				n += i % 2 ? ' R' : ' L'
			} else if (i < 36) {
				channelID =
					feedbackID =
					muteFeedbackID =
					variableID =
						[
							'bus1',
							'bus2',
							'bus3',
							'bus4',
							'bus5',
							'bus6',
							'fxsend1',
							'fxsend2',
							'fxsend3',
							'fxsend4',
						][i - 26]
				n = [
					'Bus 1',
					'Bus 2',
					'Bus 3',
					'Bus 4',
					'Bus 5',
					'Bus 6',
					'FX Send 1',
					'FX Send 2',
					'FX Send 3',
					'FX Send 4',
				][i - 26]
			} else {
				let m = parseInt((i - 36) / 2)
				channelID = feedbackID = muteFeedbackID = ['lr', 'mon'][m]
				channelID += i % 2 ? '_r' : '_l'
				variableID = feedbackID += i % 2 ? '_r' : '_l'
				n = ['Main out', 'Monitor out'][m]
				n += i % 2 ? ' R' : ' L'
			}
		}
		//feedbackID = feedbackID || `${channelID}`
		// let muteFeedbackID = `m_${feedbackID}`
		variableID = `m_${variableID}`
    meterFBID = `m_${feedbackID}`

		meter1[i] = meterFBID
		stat[meterFBID] = {
			vName: variableID,
			valid: false,
			fbID: feedbackID,
			muteID: muteFeedbackID,
      meterID: meterFBID,
			meter: i,
			dbVal: 0,
			total: 0,
			count: 9,
			samples: Array(10).fill(0),
		}

		// add variables and feedbacks
		variables.push({
			variableId: variableID,
			name: `Meter on ${n}`,
		})
	}
	feedbacks['meters'] = {
		type: 'advanced',
		name: 'Meter bar',
		description: 'Adds input/output meter bar to button',
		options: [
			{
				type: 'dropdown',
				label: 'Type',
				id: 'type',
				default: 'ch',
				choices: stripType,
			},
			{
				// channel numbers
				type: 'number',
				label: 'Number',
				id: 'num1',
				min: 1,
				max: 16,
				isVisible: (options) => options.type == 'ch',
			},
			{
				// aux / rtn
				type: 'number',
				label: 'Number',
				id: 'num2',
				min: 1,
				max: 4,
				isVisible: (options) => ['rtn', 'fx'].includes(options.type),
			},
			{
				// bus
				type: 'number',
				label: 'Number',
				id: 'num3',
				min: 1,
				max: 6,
				isVisible: (options) => options.type == 'bus',
			},
			{
				// aux / rtn / main / mon: L/R
				type: 'dropdown',
				label: 'Left/Right',
				id: 'pan',
				default: 'l',
				choices: [
					{ id: 'l', label: 'Left' },
					{ id: 'r', label: 'Right' },
				],
				isVisible: (options) => ['aux', 'rtn', 'lr', 'mon'].includes(options.type),
			},
			{
				type: 'dropdown',
				label: 'Bar Location',
				id: 'loc',
				default: 'b',
				choices: self.BAR_LOCATION,
			},
		],
		callback: async (feedback) => {
			const loc = feedback.options.loc
			const type = feedback.options.type
			const top = loc == 'b' ? feedback.image.height - 6 : 3
			const left = loc == 'r' ? feedback.image.width - 6 : 3
			let dbVal = -1
			let fbID = type
			switch (type) {
				case 'ch':
					fbID += '_' + feedback.options.num1
					break
				case 'rtn':
				case 'fx':
					fbID += feedback.options.num2
					break
				case 'bus':
					fbID += feedback.options.num3
					break
			}

			if (['aux', 'rtn', 'lr', 'mon'].includes(type)) {
				fbID += `_${feedback.options.pan}`
			}

			let muteID = ''
			let newValue = 0

			if (fbID) {
        fbID = `m_${fbID}`
				dbVal = self.mStat[fbID].valid ? self.mStat[fbID].dbVal : -128
				newValue = (60 + Math.max(dbVal, -60)) *100 / 60
				// newValue = newValue * 100
				// newValue = newValue / 60
				// newValue = 100 + newValue
				muteID = self.mStat[fbID].muteID
			} else {
				return
			}

			const meter = graphics.bar({
				width: feedback.image.width,
				height: feedback.image.height,
				barWidth: 4,
				barLength: feedback.image.height - 12,
				colors: [
					{
						size: 25,
						color: combineRgb(0, 128, 0),
						background: combineRgb(0, 128, 0),
						backgroundOpacity: 64,
					},
					{
						size: 50,
						color: combineRgb(0, 192, 0),
						background: combineRgb(0, 192, 0),
						backgroundOpacity: 64,
					},
					{
						size: 15,
						color: combineRgb(192, 192, 0),
						background: combineRgb(192, 192, 0),
						backgroundOpacity: 64,
					},
					{
						size: 10,
						color: combineRgb(192, 0, 0),
						background: combineRgb(192, 0, 0),
						backgroundOpacity: 64,
					},
				],

				type: ['t', 'b'].includes(loc) ? 'horizontal' : 'vertical',
				offsetX: left,
				offsetY: top,
				value: newValue, // (dbVal + 60.0) * 100 / 60,
				// Math.pow((60 + dbVal) / 60, 0.5) * 100,
				// Math.pow(meter1 / 100, 0.25) * 100,
				meter2: 0, // Math.pow(meter2 / 100, 0.25) * 100,
				opacity: self.xStat[self.fbToStat[muteID]].isOn ? 255 : 128, //
			})

			return {
				imageBuffer: meter,
			}
		},
	}
	Object.assign(self.mStat, stat)
	Object.assign(self.fbToMeter, fbToMeter)
	Object.assign(self.meterFeedbacks, feedbacks)
	self.variableDefs.push(...variables)
	self.meter1 = meter1
}
