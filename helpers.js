import { Regex } from '@companion-module/base'
// helper functions

const REGEX_PERCENT = new RegExp(Regex.PERCENT)
/**
 * Returns the passed integer left-padded with '0's
 * Will truncate result length is greater than 'len'
 * @param {number} num - number to pad
 * @param {number} [len=2] - optional length of result, defaults to 2
 * @returns {string}
 * @since 2.3.0
 */
export function pad0(num, len = 2) {
	return num.toString().padStart(len,'0')
}

/**
 * Replace (clean) slashes '/' with another character
 *
 * @param {string} s - string to clean
 * @param {string} [r="_"] - replace with, defaults to '_'
 * @returns {string}
 */
export function unSlash(s, r = '_') {
	return s.split('/').join(r)
}

/**
 * Return appropriate option (1 or 0)
 * 	based on old value for toggle or direct 0 or 1
 * @param {boolean} isOn - current value (for toggle)
 * @param {number} opt - 0 forces off, 1 forces on, 2 inverts 'isOn'
 * @returns {number}
 */
export function setToggle(isOn, opt) {
	return 2 == parseInt(opt) ? 1 - isOn : parseInt(opt)
}

// calculate new fader/level float
// returns a 'new' float value
// or undefined for a store
/**
 * Calculates the new position for a fader/level set, adjust, or restore.
 *		If cross fade requested, adds to the crossfade queue and returns the 1st step.
 *		For fader store, saves the current value and returns null
 *
 * @param {*} cmd - actionId
 * @param {string} strip - OSC node for channel / trim / send level
 * @param {object} opt - option for action
 * @param {object} self - context
 * @returns {float} new fader position
 */
export async function fadeTo(cmd, strip, opt, self) {
	const stat = self.xStat[strip]
	const node = strip.split('/').pop()
	const subAct = cmd.slice(-2)
	let opTicks = 1

	if (subAct == '_a') {
		opTicks = String(await self.parseVariablesInString(`${opt.ticks}`)).trim()
		if (opTicks && REGEX_PERCENT.test(opTicks)) {
			throw new Error('Invalid Adjust Percentage')
		}
		opTicks = parseInt(opTicks)
	}
	const faderLim = !!opt.faderLim
	const steps = stat.fSteps
	const span = parseFloat(opt.duration)
	const oldVal = stat[node]
	const oldIdx = stat.idx
	const byVal = (opTicks * steps) / 100
	const newIdx = Math.min(steps - 1, Math.max(0, oldIdx + Math.round(byVal)))
	const slot = opt.store == 'me' ? strip : opt.store
	let r = -1

	switch (subAct) {
		case '_a': // adjust +/- (pseudo %)
			r = self.fLevels[steps][newIdx]
			break
		case '_r': // restore
			r = slot && self.tempStore[slot] ? self.tempStore[slot] : -1
			break
		case '_s': // store
			if (slot) {
				// sanity check
				self.tempStore[slot] = stat[node]
			}
			r = null
			// the 'store' actions are internal to this module only
			// intentionally returns 'null' vs an accidental 'undefined'
			break
		default: // set new value
			r = parseFloat(opt[node] || opt.fad)
	}
	// if max fader limit check requested
	// anything over -0.3db resets to 0db
	faderLim && r >= 0.74 ? (r = 0.75) : r

	// set up cross fade?
	if (span > 0 && r >= 0) {
		const xSteps = span / (1000 / self.fadeResolution)
		const xDelta = Math.floor(((r - oldVal) / xSteps) * 10000) / 10000
		if (xDelta !== 0) {
			self.crossFades[strip] = {
				steps: xSteps,
				delta: xDelta,
				startVal: oldVal,
				finalVal: r,
				atStep: 1,
			}
			// return start of the xfade
			r = oldVal + xDelta
		}
	}
	// self.log('debug',`---------- ${oldIdx}:${oldVal} by ${byVal}(${opTicks}) fadeTo ${newIdx}:${r} ----------`);
	return r
}
