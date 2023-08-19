import { CreateConvertToBooleanFeedbackUpgradeScript } from '@companion-module/base'
import { combineRgb } from '@companion-module/base'
import { ICON_SOLO } from './icons.js'

export const UpgradeScripts = [
	// grab these values for later

	// [0]
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (let action of props.actions) {
			if (['mute', 'mMute', 'usbMute'].includes(action.actionId)) {
				if (action.options.mute === null) {
					action.options.mute = '0'
					result.updatedActions.push(action)
				}
			}
			if ('mute_grp' == action.actionId) {
				if (action.options.mute === null) {
					action.options.mute = '1'
					result.updatedActions.push(action)
				}
			}
		}

		return result
	},

	CreateConvertToBooleanFeedbackUpgradeScript({
		'solo_mute': true,
		'solo_mono': true,
		'solo_dim': true,
		'rtn': true,
		'lr': true,
		'fxsend': true,
		'dca': true,
		'bus': true,
		'ch': true,
		'solosw_aux': true,
		'solosw_bus': true,
		'solosw_ch': true,
		'solosw_dca': true,
		'solosw_fxr': true,
		'solosw_fxs': true,
		'solosw_lr': true,
		'rtn/aux': true,
		'config/mute': true,
	}),

	// [1]
	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (let fb of props.feedbacks) {
			if (fb.feedbackId?.match(/^solosw_/) && Object.keys(fb.style).length == 0) {
				fb.style = {
					color: combineRgb(255, 255, 255),
					bgcolor: 0,
					png64: ICON_SOLO,
				}
				result.updatedFeedbacks.push(fb)
			}
		}
		return result
	},

	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}
		for (let action of props.actions) {
			let changed = false
			let aId = action.actionId
			if (aId.match(/^send/)) {
				// chNum changed to num to match other actions
				if (action.options.chNum != undefined) {
					action.options.num = action.options.chNum
					delete action.options.chNum
					changed = true
				}
			}
			if (aId.match(/^fad|send|mFad|usbFad/)) {
				action.options.faderLim = false
				changed = true
			}
			if (changed) {
				result.updatedActions.push(action)
			}
		}
		return result
	},
	CreateConvertToBooleanFeedbackUpgradeScript({
		'snap_color': true,
	}),
]
