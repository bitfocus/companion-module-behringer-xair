// helper functions
export function pad0(num, len) {
	len = len || 2
	return ('00' + num).slice(-len)
}

export function unSlash(s) {
	return s.split('/').join('_')
}

export function setToggle(isOn, opt) {
	return 2 == parseInt(opt) ? 1 - isOn : parseInt(opt)
}

// calculate new fader/level float
// returns a 'new' float value
// or undefined for a store
export function fadeTo(cmd, strip, opt, self) {
	const stat = self.xStat[strip]
	const node = strip.split('/').pop()
	const subAct = cmd.slice(-2)


	const opTicks = parseInt(opt.ticks)
	const faderLim = opt.faderLim
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
			// byVal = (opTicks * steps) / 100
			// newIdx = Math.min(steps - 1, Math.max(0, oldIdx + Math.round(byVal)))
			r = self.fLevels[steps][newIdx]
			// When "Limit faders to 0dB Max" is checked, If fader was going to be >0dB, aim at 0dB (also, -0.3dB will and above snap to 0.0dB)
			faderLim && r >= 0.74 ? r = 0.75 : r;
			break
		case '_r': // restore
			r = slot && self.tempStore[slot] ? self.tempStore[slot] : -1
			break
		case '_s': // store
			if (slot) {
				// sanity check
				self.tempStore[slot] = stat[node]
			}
			// the 'store' actions are internal to this module only
			// r is left undefined since there is nothing to send
			break
		default: // set new value
			r = parseFloat(opt.fad)
	}
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
			// start the xfade
			r = oldVal + xDelta
		}
	}

	// self.log('debug',`---------- ${oldIdx}:${oldVal} by ${byVal}(${opTicks}) fadeTo ${newIdx}:${r} ----------`);

	return r
}
