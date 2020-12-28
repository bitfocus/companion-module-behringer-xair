
var instance_skel = require('../../instance_skel');
var OSC = require('osc');
var stripDef = require('./stripdef.json');
var soloDef = require('./solodef.json');
var debug;
var log;

function instance(system, id, config) {
	var self = this;
	var po = 0;

	self.currentSnapshot = {
		name: '',
		index: 0
	};

	self.myMixer = {
		name: '',
		model: '',
		fwVersion: ''
	};

	// mixer state
	self.xStat = {};
	// stat id from mixer address
	self.fbToStat = {};
	self.soloOffset = {};
	self.actionDefs = {};
	self.muteFeedbacks = {};
	self.colorFeedbacks = {};
	self.variableDefs = [];
	self.blinkingFB = {};
	self.needStats = true;

	self.setConstants();

	// super-constructor
	instance_skel.apply(this, arguments);

	if (process.env.DEVELOPER) {
		self.config._configIdx = -1;
	}

	self.addUpgradeScript(function(config, actions, releaseActions, feedbacks) {
		var changed = false;

		function upgradePass(actions, changed) {
			for (var k in actions) {
				var action = actions[k];

				if (['mute','mMute','usbMute'].includes(action.action)) {
					if (action.options.mute === null) {
						action.options.mute = '0';
						changed = true;
					}
				}
				if ('mute_grp' == action.action) {
					if (action.options.mute === null) {
						action.options.mute = '1';
						changed = true;
					}
				}
			}
			return changed;
		}

		changed = upgradePass(actions, changed);
		changed = upgradePass(releaseActions, changed);


		return changed;
	});

	// each instance needs a separate local port
	id.split('').forEach(function (c) {
		po += c.charCodeAt(0);
	});
	self.port_offset = po;

	self.debug = debug;
	self.log = log;

	return self;
}

instance.prototype.ICON_SOLO =
	'iVBORw0KGgoAAAANSUhEUgAAAEgAAAA6CAYAAAATBx+NAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAUcSURBVHic7ZpLaFxVGIC//96ZTNKkqSnGN+JzUS3oyqi1ogstqKAIuhIVFEUUtOBGhC5UxI2FgigYKLqpFRdV8FFsN1rFbtoGWwyl1lStsa+0NjNJzsy5M7+LuXdyZzKT00zSJpTzwYU573O/+c859w4jeQ0UTytMsNgzWOp4QQ4y6YQijyrl4cWazFIgIHgHeDJJ1wkKKf/dLRy64LNaQuSV8XTaLzEHXpADL8iBF+TAC3LgBTnwghx4QQ68IAdekAMvyIEX5MALcuAFOfCCHHhBDrwgB16QAy/IgRfkwAty4AU58IIceEEOvCAHXpADL8iBF+TAC3LgBTnwghx4QQ68IAcNf8GjfzEmoUpfucgalJUIY2VhpKODYRHa+gduZPhY4XpVjnd08dS8JpfXQJNrXIORgnL5vDqcIyXDC9ZQsAZtuE5Ehofa6dMafrUGLRlG5to2r8FgyslUbYmJgsB1SrBzXLm0nYnNldIkAwIfAd1NivsryhUXYh6zURPUYStINaBXC8GOs8rK8z54wLOpOWxEuVfgEYQ3YYn8mTQJpzgkdaJcC699/yl953Nsa9gRL6eTjWWqBKqsaMjrskXesIY91jBqDfut4T1tmGerJaZKr53i7bh81BqGbJENqtMR3LjE6gTNlBT+clJZvtBiUjeyLR43iqZ4WpVsq7qqdFjDj032KrWG31S5JNXvDEGqLLeGoabti+xWpbOZoBnHvABZWyGoKKB3dhJuP6H0LKya2mB74k+hCp9GJf61hi+iIk+okktXjYq8CqyN5/g7yrvAUFy8qlzkrdmGiopsAG6Lkwfi9gcBUAaiEq83bZjXQAupCEpfE2VJImnXMW26kc4LVfoiw+EWUbHfGG5I6iZRYQ1lY7gxbr/CGsbj/NOq1f2sWQRZw7G43pSOVw8hneQaa7Bx/sHYx+wRlKbDKmE1ku7pRrYlYbhQiHAmLHEHsAk401C8OqzmEy+9W+P84c5ODsftzwI/xfl9xnBts3F0giuh9viyW3o5BSDLOIrWovBmbRIEVUGzPI5la5LkgQLyZWPozxfpZSzbyWuZHJeh3CfC5lTxOlVCoIfp024s3V6lerMAYVi/qScUQ3pTyVN1hVLrT5isqwec46tG1iphWQFZV0C2zraZtosIUbaLHzI5ngN2JUMzQT8wwfTXWHdiSeoEq1TIN+s7V6GQStafzOkTcNnM9uf8LpaNapIeiyVlnI0cWMPGkuFlVTpq863KTx5UK3QzLkKJZEOFW3SSq+O6XcCaOH88l+PPpgN1MZqKlAGNT2bN049wO4DAiEidSGCOL6spSY8XCLbMV5IqVwl8EBX5xxq+iopsjooMAaviKvtEmKR6B1vivDAK+LpkWB8V+Y44IgQ+F6HcbBwRVJTP4mRPVGJ7ybA+yvAtVL8c1Vr/9eQ10EKl+SnW6pqMJHl3+yQ5OdqhNMXWWcYpR4aHUzKXWcPeZnVLhiNamH6HbPEctDIyHGox1oEkquZ0irUiiSSBZyYIBtuVlLW8ovAS8L3AH0CJ6mm2A+XBTCffJHVFmMzkuB94X+EIYIFRgcFsmbukh+O1urAb2Inyc6r96dByt8CHwFHAKvwFbMrkWCvSfP+SvAYqCrlSZc43GGWEKBSAwR4qL7b788RSIq/BIPB8nDTzEgQQhUKUEUCHQfYu1EQXkQHgpvjztKDqq0V7VAJBZUEmt9QwGQAVKIcX5x3Ol4xUH8LaRqt9CNVN86JCYep/T6xGm2u0hEsAAAAASUVORK5CYII=';


instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;
	self.init_osc();
	self.init_stats();
	self.init_solos();
	self.init_actions();
	self.init_variables();
	self.init_feedbacks();
	self.init_presets();
};

instance.prototype.init = function() {
	var self = this;

	debug = self.debug;
	log = self.log;

	self.init_osc();
	self.init_stats();
	self.init_solos();
	self.init_actions();
	self.init_variables();
	self.init_feedbacks();
	self.init_presets();
	debug(Object.keys(self.xStat).length + " status addresses loaded");
};

/**
 * heartbeat to request updates, expires every 10 seconds
 */
instance.prototype.pulse = function () {
	var self = this;
	self.sendOSC("/xremote", []);
	// any leftover status needed?
	if (self.needStats) {
		self.pollStats();
	}
};

/**
 * blink feedbacks
 */
instance.prototype.blink = function () {
	var self = this;
	for (var f in self.blinkingFB) {
		self.checkFeedbacks(f);
	}
};

instance.prototype.init_presets = function () {
	var self = this;

	var presets = [
		{
			category: 'Channels',
			label: 'Channel 1 Label\nIncludes Label, Color, Mute toggle, Mute feedback, Solo feedback',
			bank: {
				style: 'png',
				text: '$(xair:l_ch1)',
				size: '18',
				color: self.rgb(255,255,255),
				bgcolor: 0
			},
			actions: [
				{
					action: 'mute',
					options: {
						type: '/ch/',
						num: 1,
						mute: 2
					}
				}
			],
			feedbacks: [
				{
					type: 'c_ch',
					options: {
						theChannel: 1
					}
				},
				{
					type: 'ch',
					options: {
						fg: 16777215,
						bg: self.rgb(128,0,0),
						theChannel: 1
					}
				},
				{
					type: 'solosw_ch',
					options: {
						theChannel: 1
					}
				}
			]
		},
		{
			category: 'Channels',
			label: 'Channel 1 Level\nIncludes Fader dB, Color, Solo toggle',
			bank: {
				style: 'png',
				text: '$(xair:f_ch1_d)',
				size: '18',
				color: self.rgb(255,255,255),
				bgcolor: 0
			},
			actions: [
				{
					action: 'solosw_ch',
					options: {
						num: 1,
						solo: 2
					}
				}
			],
			feedbacks: [
				{
					type: 'c_ch',
					options: {
						theChannel: 1
					}
				}
			]
		}
	];
	self.setPresetDefinitions(presets);
};

instance.prototype.init_solos = function () {
	var self = this;

	var c, i, ch, cm, cMap, id, actID, soloID, cmd, pfx;

	var stat = {};
	var fbDescription;
	var soloActions = [];
	var soloFeedbacks = {};
	var soloVariables = [];
	var soloOffset = {};

	function soloLabel(d, min, max) {
		return d + (0 == max-min ? '' : " (" + min + "-" + max + ")");
	}


	var def = soloDef;

	for (id in def) {
		cmd = def[id];
		pfx = cmd.prefix;
		cMap = cmd.cmdMap;
		switch (cmd.id) {
		case "solosw":
			for (cm in cmd.cmdMap) {
				ch = cMap[cm];
				soloID = cmd.id + '_' + ch.actID;
				soloOffset[soloID] = ch.offset;
				soloActions[soloID] = {
					label: soloLabel("Solo " + ch.description, ch.min, ch.max),
					options: []
				};
				if (ch.min == ch.max) {
					c = ('00' + (ch.min + ch.offset)).slice(-2);
					self.fbToStat[soloID] = pfx + c;
					stat[pfx + c] = {
						fbID: soloID, //+ '_' + c,
						valid: false,
						polled: 0,
						hasOn: true,
						isOn: false
					};
				} else {
					for (i = ch.min; i<=ch.max; i++) {
						c = ('00' + (i + ch.offset)).slice(-2);
						self.fbToStat[soloID + i] = pfx + c;
						stat[pfx + c] = {
							fbID: soloID, // + '_' + c,
							valid: false,
							polled: 0,
							hasOn: true,
							isOn: false
						};
					}
					soloActions[soloID].options.push( {
						type: 'number',
						label: ch.description,
						id: 'num',
						default: 1,
						min: ch.min,
						max: ch.max,
						range: false,
						required: true
					});

				}
				soloActions[soloID].options.push( {
					type:	'dropdown',
					label:	'Solo',
					id:		'solo',
					default: '2',
					choices: [
						{id: '1', label: 'On'},
						{id: '0', label: 'Off'},
						{id: '2', label: 'Toggle'}
					]
				} );
				// solo feedback defs
				fbDescription = "Solo " + ch.description + " On";
				soloFeedbacks[soloID] = {
					label: 		 fbDescription,
					description: "Indicate when " + fbDescription,
					options: [
						// {
						// 	type: 'colorpicker',
						// 	label: 'Foreground color',
						// 	id: 'fg',
						// 	default: '16777215'
						// },
						// {
						// 	type: 'colorpicker',
						// 	label: 'Background color',
						// 	id: 'bg',
						// 	default: self.rgb(96,96,0)
						// },
					],
					callback: function(feedback, bank) {
						var theChannel = feedback.options.theChannel;
						var fbType = feedback.type;
						var stat;
						if (theChannel) {
							stat = self.xStat[self.fbToStat[fbType + theChannel]];
						} else if ( self.fbToStat[fbType] ) {
							stat = self.xStat[self.fbToStat[fbType]];
						}
						if (stat.isOn) {
							return { color: 16777215, bgcolor: 0, png64: self.ICON_SOLO };
						}
					}
				};
				if (ch.min != ch.max) {
					soloFeedbacks[soloID].options.push( {
						type: 'number',
						label: ch.description + " number",
						id: 'theChannel',
						default: 1,
						min: ch.min,
						max: ch.max,
						range: false,
						required: true
					} );
				}
			}
			break;
		case "config":
			for (cm in cmd.cmdMap) {
				ch = cMap[cm];
				actID = 'solo_' + ch.actID;
				soloID = 'f_solo';
				c = pfx + ch.actID;
				stat[c] = {
					fbID: actID,
					varID: soloID,
					valid: false,
					polled: 0
				};
				self.fbToStat[actID] = c;
				if (ch.isFader) {
					fbDescription = "Solo " + ch.description;
					soloActions[actID] = {
						label: fbDescription + " Set",
						options: [ {
							type:	'dropdown',
							label:	'Fader Level',
							id:		'fad',
							choices: self.fader_val
						} ]
					};
					soloActions[actID + '_a'] = {
						label: fbDescription + " Adjust",
						options: [{
							type:	 'number',
							tooltip:	 "Move fader +/- percent.\nFader Percent:\n0 = -oo, 75 = 0db, 100 = +10db",
							label:	 'Adjust',
							id:		 'ticks',
							min:	 -100,
							max:	 100,
							default: 1
						} ]
					};
					stat[c].fader = 0;
					soloVariables.push({
						label: fbDescription + " dB",
						name: soloID + "_d"
					});
					soloVariables.push({
						label: fbDescription + " %",
						name: soloID + "_p"
					});
				} else {
					soloActions[actID] = {
						label: "Solo " + ch.description,
						options: []
					};
					soloActions[actID].options.push( {
						type:	'dropdown',
						label:	'Value',
						id:		'set',
						default: '2',
						choices: [
							{id: '1', label: 'On'},
							{id: '0', label: 'Off'},
							{id: '2', label: 'Toggle'}
						]
					} );
					stat[c].isOn = false;
					soloFeedbacks[actID] = {
						label: 		 "Solo " + ch.description + " on",
						description: "Color on Solo " + ch.description,
						options: [
							{
								type: 'colorpicker',
								label: 'Foreground color',
								id: 'fg',
								default: '16777215'
							},
							{
								type: 'colorpicker',
								label: 'Background color',
								id: 'bg',
								default: self.rgb.apply(this, ch.bg)
							},
						],
						callback: function(feedback, bank) {
							var fbType = feedback.type;
							var stat = self.xStat[self.fbToStat[fbType]];
							if (stat.isOn) {
								return { color: feedback.options.fg, bgcolor: feedback.options.bg };
							}
						}
					};
				}
			}
			break;
		case 'action':
			for (cm in cmd.cmdMap) {
				ch = cMap[cm];
				actID = ch.actID;
				c = pfx + ch.actID;
				soloID = ch.statID;
				soloActions[actID] = {
					label: ch.description,
					description: ch.description,
					options: []
				};
				stat[soloID] = {
					fbID: actID,
					valid: false,
					polled: 0
				};
				self.fbToStat[actID] = soloID;
				if (!ch.hasFader) {
					stat[soloID].isOn = false;
					soloFeedbacks[actID] = {
						label: 		 ch.statDesc,
						description: "Color when " + ch.description,
						options: [
							{
								type: 	'checkbox',
								label: 	'Blink?',
								id:		'blink',
								default: 0
							},
							{
								type: 'colorpicker',
								label: 'Foreground color',
								id: 'fg',
								default: 0
							},
							{
								type: 'colorpicker',
								label: 'Background color',
								id: 'bg',
								default: self.rgb.apply(this,ch.bg)
							},
						],
						callback: function(feedback, bank) {
							var opt = feedback.options;
							var fbType = feedback.type;
							var stat = self.xStat[self.fbToStat[fbType]];

							if (stat.isOn) {
								if (opt.blink) {		// wants blink
									if (self.blinkingFB[stat.fbID]) {
										self.blinkingFB[stat.fbID] = false;
										// blink off
										return;
									} else {
										self.blinkingFB[stat.fbID] = true;
									}
								}
								return { color: opt.fg, bgcolor: opt.bg };
							} else if (self.blinkingFB[stat.fbID]) {
								delete self.blinkingFB[stat.fbID];
							}

						}
					};
				}
			}
			break;
		}
	}
	self.soloOffset = soloOffset;
	Object.assign(self.xStat, stat);
	Object.assign(self.variableDefs, soloVariables);
	Object.assign(self.actionDefs, soloActions);
	Object.assign(self.muteFeedbacks, soloFeedbacks);
};

instance.prototype.init_stats = function () {
	var self = this;

	var i, b, c, d, l;

	var muteSfx;
	var labelSfx;
	var fadeSfx;
	var defaultLabel;
	var chID;
	var theID;
	var muteID;
	var fadeID;
	var sendID;
	var fbID;
	var fID;
	var bOrF;
	var sChan;
	var fbDescription;

	var stat = {};
	var muteActions = {};
	var fadeActions = {};
	var sendActions = {};
	var muteFeedbacks = {};
	var colorFeedbacks = {};
	var defVariables = [];
	var muteChoice;

	var busOpts = [];

	for (b=1; b<11; b++) {
		busOpts.push({
			label: (b<7 ? " Bus " + b : " FX " + (b - 6) ), id: b
		});
	}

	function capFirst(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	}

	function unslash(s) {
		return s.split('/').join('_');
	}

	function sendLabel(d, min, max) {
		return d + (min == 0 ? '' : " " + min + "-" + max);
	}

	for (i in stripDef) {
		fbID = stripDef[i].id;
		chID = '/' + fbID;
		muteID = stripDef[i].muteID;
		fadeID = stripDef[i].fadeID;
		d = stripDef[i].digits;
		muteChoice = [ stripDef[i].hasOn ? '0' : '1', stripDef[i].hasOn ? '1' : '0', '2'];
		muteSfx = (stripDef[i].hasMix ? '/mix' : '') + (stripDef[i].hasOn ? '/on' : '');
		fadeSfx = (stripDef[i].hasMix ? '/mix' : '') + (stripDef[i].hasOn ? '/fader' : '');
		labelSfx = (stripDef[i].hasOn ? '/config' : '');
		defaultLabel = stripDef[i].label;
		if (defaultLabel != '' && d > 0 ){
			defaultLabel = defaultLabel + ' ';
		}

		if (muteID in muteActions) {
			muteActions[muteID].options[0].choices.push({
				id:    chID + '/',
				label: stripDef[i].description + " " + stripDef[i].min + "-" + stripDef[i].max
			});
			l = muteActions[muteID].options[1].label + ", " + stripDef[i].description;
			muteActions[muteID].options[1].label = l;
		} else {
			if (stripDef[i].hasOn == true) {
				if (d>0) {					// one of the channel mutes
					muteActions[muteID] = {
						label: "Mute " + stripDef[i].description,
						options: [
							{
								type:	'dropdown',
								label:	'Type',
								id:		'type',
								choices: [ {
									id: 	chID + '/',
									label: stripDef[i].description + " "  + stripDef[i].min + "-" + stripDef[i].max
								} ],
								default: chID + '/'
							},
							{
								type: 'number',
								label: stripDef[i].description,
								id: 'num',
								default: 1,
								min: stripDef[i].min,
								max: stripDef[i].max,
								range: false,
								required: true
							}
						]
					};
				} else {						// Main LR, Aux/USB
					muteActions[muteID] = {
						label: "Mute " + stripDef[i].description,
						options: []
					};
				}
			} else {							// Mute Group
				muteActions[muteID] = {
					label: stripDef[i].description,
					options: [
						{
							type:	'number',
							label:	stripDef[i].description + " " + stripDef[i].min + "-" + stripDef[i].max,
							id:		'mute_grp',
							default:'1',
							min: stripDef[i].min,
							max: stripDef[i].max,
							range: false,
							required: true
						}
					]
				};
			}

			muteActions[muteID].options.push( {
				type:	'dropdown',
				label:	'Mute / Unmute',
				id:		'mute',
				default: '2',
				choices: [
					{id: muteChoice[0], label: 'Mute'},
					{id: muteChoice[1], label: 'Unmute'},
					{id: '2', 			label: 'Toggle'}
					]
				}
			);
			muteActions[muteID].order = i;
		}

		if (fadeID in fadeActions) {
			fadeActions[fadeID].options[0].choices.push({
				id:    chID + '/',
				label: stripDef[i].description + " " + stripDef[i].min + "-" + stripDef[i].max
			});
			l = fadeActions[fadeID].options[1].label + ", " + stripDef[i].description;
			fadeActions[fadeID].options[1].label = l;
			fadeActions[fadeID + '_a'].options[0].choices.push({
				id:    chID + '/',
				label: stripDef[i].description + " " + stripDef[i].min + "-" + stripDef[i].max
			});
			l = fadeActions[fadeID + '_a'].options[1].label + ", " + stripDef[i].description;
			fadeActions[fadeID + '_a'].options[1].label = l;
		} else {
			if (stripDef[i].hasOn == true) {
				if (d>0) {					// one of the channel strips
					fadeActions[fadeID] = {
						label: "Fader Set",
						options: [
							{
								type:	'dropdown',
								label:	'Type',
								id:		'type',
								choices: [ {
									id: 	chID + '/',
									label: stripDef[i].description + " "  + stripDef[i].min + "-" + stripDef[i].max
								} ],
								default: chID + '/'
							},
							{
								type: 'number',
								label: stripDef[i].description,
								id: 'num',
								default: 1,
								min: stripDef[i].min,
								max: stripDef[i].max,
								range: false,
								required: true
							}
						]
					};
					fadeActions[fadeID+'_a'] = {
						label: "Fader Adjust",
						options: [
							{
								type:	'dropdown',
								label:	'Type',
								id:		'type',
								choices: [ {
									id: 	chID + '/',
									label: stripDef[i].description + " "  + stripDef[i].min + "-" + stripDef[i].max
								} ],
								default: chID + '/'
							},
							{
								type: 'number',
								label: stripDef[i].description,
								id: 'num',
								default: 1,
								min: stripDef[i].min,
								max: stripDef[i].max,
								range: false,
								required: true
							}
						]
					};
				} else {						// Main LR, Aux/USB
					fadeActions[fadeID] = {
						label: stripDef[i].description + " Fader Set",
						options: []
					};
					fadeActions[fadeID+'_a'] = {
						label: stripDef[i].description + " Fader Adjust",
						options: []
					};
				}	// else mute group (no fader)
			}

			if (stripDef[i].hasOn) {
				fadeActions[fadeID].options.push( {
					type:	'dropdown',
					label:	'Fader Level',
					id:		'fad',
					choices: self.fader_val
				});

				fadeActions[fadeID].order = i;

				fadeActions[fadeID + '_a'].options.push( {
					type:	 'number',
					tooltip:	 "Move fader +/- percent.\nFader Percent:\n0 = -oo, 75 = 0db, 100 = +10db",
					label:	 'Adjust',
					id:		 'ticks',
					min:	 -100,
					max:	 100,
					default: 1
				});

				fadeActions[fadeID + '_a'].order = i;
			}
		}

		if (stripDef[i].hasLevel) {
			sendID = 'send';
			if (sendID in sendActions) {
				sendActions[sendID].options[0].choices.push({
					id:    chID + '/',
					label: sendLabel(stripDef[i].description, stripDef[i].min, stripDef[i].max)
				});
				l = sendActions[sendID].options[1].label + ", " + stripDef[i].description;
				sendActions[sendID].options[1].label = l;
				sendActions[sendID + '_a'].options[0].choices.push({
					id:    chID + '/',
					label: sendLabel(stripDef[i].description, stripDef[i].min, stripDef[i].max)
				});
				l = sendActions[sendID + '_a'].options[1].label + ", " + stripDef[i].description;
				sendActions[sendID + '_a'].options[1].label = l;
			} else {
				sendActions[sendID] = {
					label: "Send Level Set",
					options: [
						{
							type:	'dropdown',
							label:	'Type',
							id:		'type',
							choices: [ {
								id: 	chID + '/',
								label: sendLabel(stripDef[i].description, stripDef[i].min, stripDef[i].max)
							} ],
							default: chID + '/'
						},
						{
							type: 'number',
							label: stripDef[i].description,
							id: 'chNum',
							default: 1,
							min: stripDef[i].min,
							max: stripDef[i].max,
							range: false,
							required: true
						},
						{
							type:	'dropdown',
							label:	'Bus',
							id:		'busNum',
							choices: busOpts,
							default: 1
						},
						{
							type:	'dropdown',
							label:	"Fader Level",
							id:		'fad',
							choices: self.fader_val
						}

					]
				};
				sendActions[sendID + '_a'] = {
					label: "Send Level Adjust",
					options: [
						{
							type:	'dropdown',
							label:	'Type',
							id:		'type',
							choices: [ {
								id: 	chID + '/',
								label: sendLabel(stripDef[i].description, stripDef[i].min, stripDef[i].max)

							} ],
							default: chID + '/'
						},
						{
							type: 'number',
							label: stripDef[i].description,
							id: 'chNum',
							default: 1,
							min: stripDef[i].min,
							max: stripDef[i].max,
							range: false,
							required: true
						},
						{
							type:	'dropdown',
							label:	'Bus',
							id:		'busNum',
							choices: busOpts,
							default: 1
						},
						{
							type:	 'number',
							title:	 "Move fader +/- percent.\nFader percent:\n0 = -oo, 75 = 0db, 100 = +10db",
							label:	 "Adjust",
							id:		 'ticks',
							min:	 -100,
							max:	 100,
							default: 1
						}
					]
				};
			}
		}

		if (d == 0) {
			theID = chID + muteSfx;
			self.fbToStat[fbID] = theID;
			stat[theID] = {
				isOn: false,
				hasOn: stripDef[i].hasOn,
				valid: false,
				fbID: fbID,
				polled: 0
			};
			theID = chID + fadeSfx;
			fID = 'f_' + unslash(fbID);
			self.fbToStat[fID] = theID;
			stat[theID] = {
				fader: 0.0,
				valid: false,
				fbID: fID,
				varID: fID,
				polled: 0
			};
			defVariables.push({
				label: stripDef[i].description + " dB",
				name: fID + "_d"
			});
			defVariables.push({
				label: stripDef[i].description + " %",
				name: fID + "_p"
			});
			if ('' != labelSfx) {
				theID = chID + labelSfx + "/name";
				fID = 'l_' + unslash(fbID);
				self.fbToStat[fID] = theID;
				stat[theID] = {
					name: fbID,
					defaultName: defaultLabel,
					valid: false,
					fbID: fID,
					polled: 0
				};
				defVariables.push({
					label: stripDef[i].description + " Label",
					name: fID
				});
				theID = chID + labelSfx + "/color";
				fID = 'c_' + unslash(fbID);
				self.fbToStat[fID] = theID;
				stat[theID] = {
					color: 0,
					valid: false,
					fbID: fID,
					polled: 0
				};
			}
		} else {
			for (c = stripDef[i].min; c <= stripDef[i].max; c++) {
				theID = chID + '/' + ('00' + c).slice(-d) + muteSfx;
				fID = fbID + '_' + c;
				self.fbToStat[fID] = theID;
				stat[theID] = {
					isOn: false,
					hasOn: stripDef[i].hasOn,
					valid: false,
					fbID: fbID,
					polled: 0
				};
				if ('' != fadeSfx) {
					theID = chID  + '/' + ('00' + c).slice(-d) + fadeSfx;
					fID = 'f_' + unslash(fbID) + c;
					self.fbToStat[fID] = theID;
					stat[theID] = {
						fader: 0.0,
						valid: false,
						fbID: fID,
						polled: 0
					};
					defVariables.push({
						label: stripDef[i].description + " " + c + " dB",
						name: fID + "_d"
					});
					defVariables.push({
						label: stripDef[i].description + " " + c + " %",
						name: fID + "_p"
					});
					if (stripDef[i].hasLevel) {
						for (b = 1; b<11; b++) {
							bOrF = (b < 7 ? 'b' : 'f');
							sChan = (b < 7 ? b : b-6);
							theID = chID + '/' + ('00' + c).slice(-d) + '/mix/' + ('00' + b).slice(-2) + '/level';
							sendID = (b<7 ? " Bus " + b : " FX " + (b - 6) );
							fID = 's_' + unslash(fbID) + c + '_' + bOrF + sChan;
							self.fbToStat[fID] = theID;
							stat[theID] = {
								level: 0.0,
								valid: false,
								fbID: fID,
								varID: fID,
								polled: 0
							};
							defVariables.push({
								label: capFirst(fbID) + " " + c + sendID + " dB",
								name: fID + "_d"
							});
							defVariables.push({
								label: capFirst(fbID) + " " + c + sendID + " %",
								name: fID + "_p"
							});
						}
					}
				}
				if ('' != labelSfx) {
					theID = chID + '/' + ('00' + c).slice(-d) + labelSfx + "/name";
					fID = 'l_' + unslash(fbID) + c;
					self.fbToStat[fID] = theID;
					stat[theID] = {
						name: fbID + c,
						defaultName: defaultLabel + c,
						valid: false,
						fbID: fID,
						polled: 0
					};
					defVariables.push({
						label: stripDef[i].description + " " + c + " Label",
						name: fID
					});
					theID = chID + '/' + ('00' + c).slice(-d) + labelSfx + "/color";
					fID = 'c_' + unslash(fbID) + c;
					self.fbToStat[fID] = theID;
					stat[theID] = {
						color: 0,
						valid: false,
						fbID: 'c_' + unslash(fbID),
						polled: 0
					};
				}
			}
		}

		// mute feedback defs
		fbDescription = stripDef[i].description + " " + (stripDef[i].hasOn ? "Muted" : "On");
		muteFeedbacks[fbID] = {
			label: 		 "Color when " + fbDescription,
			description: "Set button colors when " + fbDescription,
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: '16777215'
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: self.rgb(128,0, 0)
				},
			],
			callback: function(feedback, bank) {
				var theChannel = feedback.options.theChannel;
				var fbType = feedback.type;
				var stat;
				if (theChannel) {
					stat = self.xStat[self.fbToStat[fbType + '_' + theChannel]];
				} else if ( self.fbToStat[fbType] ) {
					stat = self.xStat[self.fbToStat[fbType]];
				}
				if (stat.isOn != stat.hasOn) {
					return { color: feedback.options.fg, bgcolor: feedback.options.bg };
				}
			}
		};
		if (d>0) {
			muteFeedbacks[fbID].options.push( {
				type: 'number',
				label: stripDef[i].description + ' number',
				id: 'theChannel',
				default: 1,
				min: stripDef[i].min,
				max: stripDef[i].max,
				range: false,
				required: true
			} );
		}

		// channel color feedbacks
		if (stripDef[i].hasOn) {
			fbDescription = stripDef[i].description + " label";
			var cID = 'c_' + unslash(fbID);
			colorFeedbacks[cID] = {
				label: 		 "Color of " + fbDescription,
				description: "Use button colors from " + fbDescription,
				options: [],
				callback: function(feedback, bank) {
					var theChannel = feedback.options.theChannel;
					var fbType = feedback.type;
					var stat;
					if (theChannel) {
						stat = self.xStat[self.fbToStat[fbType + theChannel]];
					} else if ( self.fbToStat[fbType] ) {
						stat = self.xStat[self.fbToStat[fbType]];
					}
					return { color: self.color_val[stat.color].fg, bgcolor: self.color_val[stat.color].bg };
				}
			};
			if (d>0) {
				colorFeedbacks[cID].options.push( {
					type: 'number',
					label: stripDef[i].description + ' number',
					id: 'theChannel',
					default: 1,
					min: stripDef[i].min,
					max: stripDef[i].max,
					range: false,
					required: true
				} );
			}
		}
	}
	self.xStat = stat;
	self.variableDefs = defVariables;
	self.actionDefs = fadeActions;
	Object.assign(self.actionDefs, sendActions);
	Object.assign(self.actionDefs, muteActions);
	self.muteFeedbacks = muteFeedbacks;
	self.colorFeedbacks = colorFeedbacks;
};

instance.prototype.pollStats = function () {
	var self = this;
	var stillNeed = false;
	var counter = 0;
	var timeNow = Date.now();
	var timeOut = timeNow - 100;
	var id;

	for (id in self.xStat) {
		if (!self.xStat[id].valid) {
			stillNeed = true;
			if (self.xStat[id].polled < timeOut) {
				self.sendOSC(id);
				self.debug("sending " + id);
				self.xStat[id].polled = timeNow;
				counter++;
				if (counter > 5) {
					break;
				}
			}
		}
	}

	if (!stillNeed) {
		self.status(self.STATUS_OK,"Mixer Status loaded");
	}
	self.needStats = stillNeed;
};

instance.prototype.firstPoll = function () {
	var self = this;
	var id;

	self.sendOSC('/xinfo',[]);
	self.sendOSC('/-snap/name',[]);
	self.sendOSC('/-snap/index',[]);
	self.pollStats();
	self.pulse();
};

instance.prototype.faderToDB = function ( f, steps ) {
// “f” represents OSC float data. f: [0.0, 1.0]
// “d” represents the dB float data. d:[-oo, +10]
	var d = 0;

	if (f >= 0.5) {
		d = f * 40.0 - 30.0;		// max dB value: +10.
	} else if (f >= 0.25) {
		d = f * 80.0 - 50.0;
	} else if (f >= 0.0625) {
		d = f * 160.0 - 70.0;
	} else if (f >= 0.0) {
		d = f * 480.0 - 90.0;		// min dB value: -90 or -oo
	}
	return (f==0 ? "-oo" : (d>0 ? '+':'') + (Math.round(d * 1024) / 1024).toFixed(1));
};

instance.prototype.init_osc = function() {
	var self = this;
	var host = self.config.host;

	if (self.oscPort) {
		self.oscPort.close();
	}
	if (self.config.host) {
		self.oscPort = new OSC.UDPPort ({
			localAddress: "0.0.0.0",
			localPort: 10024 + self.port_offset,
			remoteAddress: self.config.host,
			remotePort: 10024,
			metadata: true
		});

		// listen for incoming messages
		self.oscPort.on('message', function(message, timeTag, info) {
			var args = message.args;
			var node = message.address;

			// debug("received ", message, "from", info);
			if (node in self.xStat) {
				var v = args[0].value;
				switch(node.split('/').pop()) {
				case 'on':
					self.xStat[node].isOn = (v == 1);
					self.checkFeedbacks(self.xStat[node].fbID);
					break;
				case '1':
				case '2':
				case '3':
				case '4': // '/config/mute/#'
					self.xStat[node].isOn = (v == 1);
					self.checkFeedbacks(self.xStat[node].fbID);
					break;
				case 'fader':
					self.xStat[node].fader = v;
					self.setVariable(self.xStat[node].fbID + '_p',Math.round(v * 100));
					self.setVariable(self.xStat[node].fbID + '_d',self.faderToDB(v,1024));
					break;
				case 'level':
					self.xStat[node].fader = v;
					self.setVariable(self.xStat[node].varID + '_p',Math.round(v * 100));
					self.setVariable(self.xStat[node].varID + '_d',self.faderToDB(v,161));
					break;
				case 'name':
					// no name, use behringer default
					if (v=='') {
						v = self.xStat[node].defaultName;
					}
					self.xStat[node].name = v;
					self.setVariable(self.xStat[node].fbID, v);
					break;
				case 'color':
					self.xStat[node].color = v;
					self.checkFeedbacks(self.xStat[node].fbID);
					break;
				case 'mono':
				case 'dim':
				case 'mute':	// '/config/solo/'
					self.xStat[node].isOn = v;
					self.checkFeedbacks(self.xStat[node].fbID);
					break;
				default:
					if (node.match(/\/solo/)) {
						self.xStat[node].isOn = v;
						self.checkFeedbacks(self.xStat[node].fbID);
					}
				}
				self.xStat[node].valid = true;
				if (self.needStats) {
					self.pollStats();
				}
				debug(message);
			} else if (node.match(/^\/xinfo$/)) {
				self.myMixer.name = args[1].value;
				self.myMixer.model = args[2].value;
				self.myMixer.fw = args[3].value;
				self.setVariable('m_name',	self.myMixer.name);
				self.setVariable('m_model', self.myMixer.model);
				self.setVariable('m_fw', self.myMixer.fw);
			} else if (node.match(/^\/\-snap\/name$/)) {
				self.currentSnapshot.name = args[0].value;
				self.setVariable('s_name', self.currentSnapshot.name);
			} else if (node.match(/^\/\-snap\/index$/)) {
				self.currentSnapshot.index = parseInt(args[0].value);
				self.setVariable('s_index', self.currentSnapshot.index);
				self.checkFeedbacks('snap_color');
			}
			// else {
			// 	debug(message.address, args);
			// }
		});

		self.oscPort.on('ready', function() {
			self.status(self.STATUS_WARNING,"Loading status");
			self.firstPoll();
			self.heartbeat = setInterval( function () { self.pulse(); }, 9500);
			self.blinker = setInterval( function() { self.blink(); }, 1000);
		});

		self.oscPort.on('close', function() {
			if (self.heartbeat) {
				clearInterval(self.heartbeat);
				delete self.heartbeat;
			}
			if (self.blinker) {
				clearInterval(self.blinker);
				delete self.blinker;
			}
		});

		self.oscPort.on('error', function(err) {
			self.log('error', "Error: " + err.message);
			self.status(self.STATUS_ERROR, err.message);
			if (self.heartbeat) {
				clearInterval(self.heartbeat);
				delete self.heartbeat;
			}
			if (self.blinker) {
				clearInterval(self.blinker);
				delete self.blinker;
			}
		});

		self.oscPort.open();
	}
};

// define instance variables
instance.prototype.init_variables = function() {
	var self = this;

	var variables = [
		{
			label: 'XAir Mixer Name',
			name:  'm_name'
		},
		{
			label: 'XAir Mixer Model',
			name:  'm_model'
		},
		{
			label: 'XAir Mixer Firmware',
			name:  'm_fw'
		},
		{
			label: 'Current Snapshot Name',
			name:  's_name'
		},
		{
			label: 'Current Snapshot Index',
			name:  's_index'
		}
	];
	variables.push.apply(variables, self.variableDefs);

	for (var i in variables) {
		self.setVariable(variables[i].name);
	}
	self.setVariableDefinitions(variables);
};

// define instance feedbacks
instance.prototype.init_feedbacks = function() {
	var self = this;

	var feedbacks = {
		snap_color: {
			label: 'Color on Current Snapshot',
			description: 'Set Button colors when this Snapshot is loaded',
			options: [
				{
					type: 'colorpicker',
					label: 'Foreground color',
					id: 'fg',
					default: '16777215'
				},
				{
					type: 'colorpicker',
					label: 'Background color',
					id: 'bg',
					default: self.rgb(0, 128, 0)
				},
				{
					type: 'number',
					label: 'Snapshot to match',
					id: 'theSnap',
					default: 1,
					min: 1,
					max: 64,
					range: false,
					required: true
				}
			],
			callback: function(feedback, bank) {
				if (feedback.options.theSnap == self.currentSnapshot.index) {
					return { color: feedback.options.fg, bgcolor: feedback.options.bg };
				}
			}
		}
	};
	Object.assign(feedbacks,this.muteFeedbacks);
	Object.assign(feedbacks,this.colorFeedbacks);
	this.setFeedbackDefinitions(feedbacks);
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			tooltip: 'The IP of the Mr / Xr console',
			width: 6,
			regex: this.REGEX_IP
		}
	];
};

// When module gets deleted
instance.prototype.destroy = function() {
	if (this.heartbeat) {
		clearInterval(this.heartbeat);
		delete this.heartbeat;
	}
	if (this.blinker) {
		clearInterval(this.blinker);
		delete this.blinker;
	}
	if (this.oscPort) {
		this.oscPort.close();
	}
	debug("destroy", this.id);
};

instance.prototype.sendOSC = function (node, arg) {
	var self = this;
	var host = "";

	if (self.oscPort) {
		self.oscPort.send({
			address: node,
			args: arg
		});
	}
};

instance.prototype.setConstants = function() {
	var self = this;
	
	self.fader_val = [
		{ label: '- ∞',        id: '0.0' },
		{ label: '-50 dB: ',   id: '0.1251' },
		{ label: '-30 dB',     id: '0.251' },
		{ label: '-20 dB',     id: '0.375' },
		{ label: '-18 dB',     id: '0.4' },
		{ label: '-15 dB',     id: '0.437' },
		{ label: '-12 dB',     id: '0.475' },
		{ label: '-9 dB',      id: '0.525' },
		{ label: '-6 dB',      id: '0.6' },
		{ label: '-3 dB',      id: '0.675' },
		{ label: '-2 dB',      id: '0.7' },
		{ label: '-1 dB',      id: '0.725' },
		{ label: '0 dB',       id: '0.75' },
		{ label: '+1 dB',      id: '0.775' },
		{ label: '+2 dB',      id: '0.8' },
		{ label: '+3 dB',      id: '0.825' },
		{ label: '+4 dB',      id: '0.85' },
		{ label: '+5 dB',      id: '0.875' },
		{ label: '+6 dB',      id: '0.9' },
		{ label: '+9 dB',      id: '0.975' },
		{ label: '+10 dB',     id: '1.0' }
	];

	self.color_val = [
		{ label: 'Off',              id: '0',	bg: 0, fg: self.rgb( 64, 64, 64) },
		{ label: 'Red: ',            id: '1',	bg: self.rgb(224,  0,  0), fg: 0 },
		{ label: 'Green',            id: '2',	bg: self.rgb(  0,224,  0), fg: 0 },
		{ label: 'Yellow',           id: '3',	bg: self.rgb(224,224,  0), fg: 0 },
		{ label: 'Blue',             id: '4',	bg: self.rgb(  0,  0,224), fg: 0 },
		{ label: 'Magenta',          id: '5',	bg: self.rgb(224,  0,224), fg: 0 },
		{ label: 'Cyan',             id: '6',	bg: self.rgb(  0,192,224), fg: 0 },
		{ label: 'White',            id: '7',	bg: self.rgb(224,224,224), fg: 0 },
		{ label: 'Off Inverted',     id: '8',	bg: self.rgb( 64, 64, 64), fg: 0 },
		{ label: 'Red Inverted',     id: '9',	bg: 0, fg: self.rgb(224,  0,  0) },
		{ label: 'Green Inverted',   id: '10',	bg: 0, fg: self.rgb(  0,224,  0) },
		{ label: 'Yellow Inverted',  id: '11',	bg: 0, fg: self.rgb(224,224,  0) },
		{ label: 'Blue Inverted',    id: '12',	bg: 0, fg: self.rgb(  0,  0,224) },
		{ label: 'Magenta Inverted', id: '13',	bg: 0, fg: self.rgb(224,  0,224) },
		{ label: 'Cyan Inverted',    id: '14',	bg: 0, fg: self.rgb(  0,192,224) },
		{ label: 'White Inverted',   id: '15',	bg: 0, fg: self.rgb(224,224,224) }
	];

	self.tape_func = [
		{ label: 'STOP',                id: '0' },
		{ label: 'PLAY PAUSE',          id: '1' },
		{ label: 'PLAY',                id: '2' },
		{ label: 'RECORD PAUSE',        id: '3' },
		{ label: 'RECORD',              id: '4' },
		{ label: 'FAST FORWARD',        id: '5' },
		{ label: 'REWIND',              id: '6' }
	];
}

instance.prototype.init_actions = function(system) {
	var self = this;
	var newActions = {};

	Object.assign(newActions, self.actionDefs, {

		'label':     {
			label:     'Set label',
			options: [
				{
					type:     'dropdown',
					label:    'Type',
					id:       'type',
					choices:  [
						{ id: '/ch/',      label: 'Channel 1-16' },
						{ id: '/rtn/',     label: 'Fx Return 1-4' },
						{ id: '/fxsend/',  label: 'Fx Send 1-4'  },
						{ id: '/bus/',     label: 'Bus 1-6'  }
					],
					default:  '/ch/'
				},
				{
					type:    'textinput',
					label:   'Channel, Fx Return, Fx Send or Bus Number',
					id:      'num',
					default: '1',
					regex: self.REGEX_NUMBER
				},
				{
					type:    'textinput',
					label:   'Label',
					id:      'lab',
					default: ''
				}
			]
		},

		'mLabel':     {
			label:       'Set Main label',
			options: [
				{
					type:    'textinput',
					label:   'Label',
					id:      'lab',
					default: ''
				}
			]
		},

		'usbLabel':     {
			label:       'Set USB label',
			options: [
				{
					type:    'textinput',
					label:   'Label',
					id:      'lab',
					default: 'USB'
				}
			]
		},

		'color':     {
			label:     'Set color',
			options: [
				{
					type:     'dropdown',
					label:    'Type',
					id:       'type',
					choices:  [
						{ id: '/ch/',      label: 'Channel 1-16' },
						{ id: '/rtn/',     label: 'Fx Return 1-4' },
						{ id: '/fxsend/',  label: 'Fx Send 1-4'  },
						{ id: '/bus/',     label: 'Bus 1-6'  }
					],
					default:  '/ch/'
				},
				{
					type:    'textinput',
					label:   'Channel, Fx Return, Fx Send or Bus Number',
					id:      'num',
					default: '1',
					regex:   self.REGEX_NUMBER
				},
				{
					type:    'dropdown',
					label:   'color',
					id:      'col',
					choices: self.color_val
				}
			]
		},

		'mColor':     {
			label:     'Set Main color',
			options: [
				{
					type:    'dropdown',
					label:   'color',
					id:      'col',
					choices: self.color_val
				}
			]
		},

		'usbColor':     {
			label:     'Set USB color',
			options: [
				{
					type:    'dropdown',
					label:   'color',
					id:      'col',
					choices: self.color_val
				}
			]
		},

		'load_snap':     {
			label:     'Load Console Snapshot',
			options: [
				{
					type:    'textinput',
					label:   'Snapshot Nr 1-64',
					id:      'snap',
					default: '1',
					regex:   self.REGEX_NUMBER
				}

			]
		},

		'tape':     {
			label:     'Tape Operation',
			options: [

				{
					type:    'dropdown',
					label:   'Function',
					id:      'tFunc',
					choices: self.tape_func
				}
			]
		}
	});



	self.system.emit('instance_actions', self.id, newActions);
};

instance.prototype.action = function(action) {
	var self = this;
	var cmd;
	var opt = action.options;
	var nVal, bVal;
	var arg = [];

	switch (action.action){

		case 'mute':
			if (opt.type == '/ch/') {
				nVal = ('0' + parseInt(opt.num)).substr(-2);
			} else {
				nVal = parseInt(opt.num);
			}
			cmd = opt.type + nVal;
			if (opt.type == '/dca/') {
				cmd += '/on';
			} else {
				cmd += '/mix/on';
			}
			arg = {
				type: 'i',
				value: 2==parseInt(opt.mute) ? 1-self.xStat[cmd].isOn : parseInt(opt.mute)
			};
		break;

		case 'mMute':
			cmd = '/lr/mix/on';
			arg = {
				type: 'i',
				value: 2==parseInt(opt.mute) ? 1-self.xStat[cmd].isOn : parseInt(opt.mute)
			};
		break;

		case 'usbMute':
			cmd = '/rtn/aux/mix/on';
			arg = {
				type: 'i',
				value: 2==parseInt(opt.mute) ? 1-self.xStat[cmd].isOn : parseInt(opt.mute)
			};
		break;

		case 'fad':
		case 'fad_a':
			if (opt.type == '/ch/') {
				nVal = ('0' + parseInt(opt.num)).substr(-2);
			} else {
				nVal = parseInt(opt.num);
			}
			cmd = opt.type + nVal;
			if (opt.type == '/dca/') {
				cmd += '/fader';
			} else {
				cmd += '/mix/fader';
			}
			if (action.action == 'fad') {
				arg = {
					type: 'f',
					value: parseFloat(opt.fad)
				};
			} else {
				arg = {
					type: 'f',
					value: Math.min(1.0,Math.max(0.0,self.xStat[cmd].fader + parseInt(opt.ticks) / 100))
				};
			}
		break;

		case 'send':
			switch (opt.type) {
			case '/ch/':
				nVal = ('0' + parseInt(opt.chNum)).substr(-2) + '/';
				break;
			case '/rtn/':
				nVal = parseInt(opt.chNum) + '/';
				break;
			default:
				nVal = '';
			}
			bVal = ('0' + parseInt(opt.busNum)).substr(-2);
			cmd = opt.type + nVal + 'mix/' + bVal + '/level';

			arg = {
				type: 'f',
				value: parseFloat(opt.fad)
			};
		break;

		case 'send_a':
			switch (opt.type) {
				case '/ch/':
					nVal = ('0' + parseInt(opt.chNum)).substr(-2) + '/';
					break;
				case '/rtn/':
					nVal = parseInt(opt.chNum) + '/';
					break;
				default:
					nVal = '';
				}
				bVal = ('0' + parseInt(opt.busNum)).substr(-2);
				cmd = opt.type + nVal + 'mix/' + bVal + '/level';

				arg = {
					type: 'f',
					value: Math.min(1.0,Math.max(0.0,self.xStat[cmd].fader + parseInt(opt.ticks) / 100))
				};
		break;

		case 'mFad':
			arg = {
				type: 'f',
				value: parseFloat(opt.fad)
			};
			cmd = '/lr/mix/fader';
		break;

		case 'mFad_a':
			cmd = '/lr/mix/fader';
			arg = {
				type: 'f',
				value: Math.min(1.0, Math.max(0.0 ,self.xStat[cmd].fader + parseInt(opt.ticks) / 100.0))
			};
		break;

		case 'usbFad':
			arg = {
				type: 'f',
				value: parseFloat(opt.fad)
			};
			cmd = '/rtn/aux/mix/fader';
		break;

		case 'usbFad_a':
			cmd = '/rtn/aux/mix/fader';
			arg = {
				type: 'f',
				value: Math.min(1.0,Math.max(0.0,self.xStat[cmd].fader + parseInt(opt.ticks) / 100))
			};
		break;

		case 'solosw_ch':
		case 'solosw_aux':
		case 'solosw_fxr':
		case 'solosw_bus':
		case 'solosw_fsx':
		case 'solosw_lr':
		case 'solosw_dca':
			nVal = (opt.num ? opt.num : 1);
			cmd = "/-stat/solosw/" + ('00' + (self.soloOffset[action.action] + nVal)).slice(-2);
			arg = {
				type: 'i',
				value: 2==parseInt(opt.solo) ? 1-self.xStat[cmd].isOn : parseInt(opt.solo)
			};

		break;

		case 'solo_level':
			cmd = '/config/solo/level';
			arg = {
				type: 'f',
				value: parseFloat(opt.fad)
			};
		break;

		case 'solo_level_a':
			cmd = '/config/solo/level';
			arg = {
				type: 'f',
				value: Math.min(1.0,Math.max(0.0,self.xStat[cmd].fader + parseInt(opt.ticks) / 100))
			};
		break;

		case 'solo_mute':
			cmd = '/config/solo/mute';
			arg = {
				type: 'i',
				value: 2==parseInt(opt.set) ? 1-self.xStat[cmd].isOn : parseInt(opt.set)
			};
		break;

		case 'solo_mono':
			cmd = '/config/solo/mono';
			arg = {
				type: 'i',
				value: 2==parseInt(opt.set) ? 1-self.xStat[cmd].isOn : parseInt(opt.set)
			};
		break;

		case 'solo_dim':
			cmd = '/config/solo/dim';
			arg = {
				type: 'i',
				value: 2==parseInt(opt.set) ? 1-self.xStat[cmd].isOn : parseInt(opt.set)
			};
		break;

		case 'clearsolo':
			cmd = '/-action/clearsolo';
			// needs an arg for some silly reason
			arg = {
				type: 'i',
				value: 1
			};
		break;

		case 'label':
			arg = {
				type: "s",
				value: "" + opt.lab
			};
			if (opt.type == '/ch/') {
				if (opt.num <= 9){
					nVal = ('0' + parseInt(opt.num)).substr(-2);
				}
				if (opt.num >= 10) {
					nVal = parseInt(opt.num);
				}
			}
			if (opt.type != '/ch/') {
				nVal = parseInt(opt.num);
			}
			cmd = opt.type + nVal + '/config/name';
		break;

		case 'mLabel':
			arg = {
				type: "s",
				value: "" + opt.lab
			};
			cmd = '/lr/config/name';
		break;

		case 'usbLabel':
			arg = {
				type: "s",
				value: "" + opt.lab
			};
			cmd = '/rtn/aux/config/name';
		break;

		case 'color':
			arg = {
				type: 'i',
				value: parseInt(opt.col)
			};
			if (opt.type == '/ch/') {
				if (opt.num <= 9){
					nVal = ('0' + parseInt(opt.num)).substr(-2);
				}
				if (opt.num >= 10) {
					nVal = parseInt(opt.num);
				}
			}
			if (opt.type != '/ch/') {
				nVal = parseInt(opt.num);
			}
			cmd = opt.type + nVal + '/config/color';
		break;

		case 'mColor':
			arg = {
				type: 'i',
				value: parseInt(opt.col)
			};
			cmd = '/lr/config/color';
		break;

		case 'usbColor':
			arg = {
				type: 'i',
				value: parseInt(opt.col)
			};
			cmd = '/rtn/aux/config/color';
		break;

		case 'mute_grp':
			cmd = '/config/mute/'+ opt.mute_grp;
			arg = {
				type: 'i',
				value: 2==parseInt(opt.mute) ? 1-self.xStat[cmd].isOn : parseInt(opt.mute)
			};
		break;

		case 'load_snap':
			arg = {
				type: 'i',
				value: parseInt(opt.snap)
			};
			cmd = '/-snap/load';
		break;

		case 'tape':
			arg = {
				type: 'i',
				value: parseInt(opt.tFunc)
			};
			cmd = '/-stat/tape/state';
		break;
	}

	if (cmd !== undefined) {
		self.sendOSC(cmd,arg);
		debug (cmd, arg);
	}
};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
