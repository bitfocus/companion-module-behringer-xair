import { CreateConvertToBooleanFeedbackUpgradeScript } from '@companion-module/base'
import { combineRgb } from '@companion-module/base'
import { ICON_SOLO } from './icons.js'

export const UpgradeScripts = [
	// grab these values for later

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
			if ('mute_grp' == action.action) {
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

	function (context, props) {
		const result = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		for (let fb of props.feedbacks) {
			if (fb.type.match(/^solosw_/) && Object.keys(fb.style).length == 0) {
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
]
