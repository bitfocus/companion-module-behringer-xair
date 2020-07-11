var instance_skel = require('../../instance_skel');
var OSC = require('osc');
var stripdef = require('./stripdef.json');
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

	// mixer mute state
	self.mute = {};
	// mute id from mixer address
	self.fbToMute = {};
	self.muteActions = {};
	self.muteFeedbacks = {};
	self.needMutes = true;

	// super-constructor
	instance_skel.apply(this, arguments);

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
	self.init_mutes();
	self.init_actions(); // export actions
	self.init_variables();
	self.init_feedbacks();

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;
	self.init_osc();
	self.init_variables();
	self.init_feedbacks();

};

instance.prototype.init = function() {
	var self = this;
	self.status(self.STATUS_OK); // status ok!
	debug = self.debug;
	log = self.log;
	self.init_osc();
	self.init_variables();
	debug(Object.keys(self.mute).length + " mutes addresses loaded");
};

/**
 * heartbeat to request updates, expires every 10 seconds
 */
instance.prototype.pulse = function () {
	var self = this;
	self.sendOSC("/xremote", []);
	// any leftover mutes needed?
	if (self.needMutes) {
		self.pollMutes();
	}
};

instance.prototype.init_mutes = function () {
	var self = this;
	var i;
	var c;
	var d;
	var l;
	var sfx;
	var chID;
	var muteID;
	var actID;
	var fbID;
	var fbDescription;

	var mute = {};
	var muteActions = {};
	var muteFeedbacks = {};
	var muteChoice;

	function channelRange(first, last, digits) {
		return ('00' +	first).slice(-digits) + "-" + ('00' + last).slice(-digits);
	}
	for (i=0; i < stripdef.length; i++) {
		fbID = stripdef[i].id;
		chID = '/' + fbID;
		actID = stripdef[i].actID;
		d = stripdef[i].digits;
		muteChoice = [ stripdef[i].hasOn ? '0' : '1', stripdef[i].hasOn ? '1' : '0', '2'];
		sfx = (stripdef[i].hasMix ? '/mix' : '') + (stripdef[i].hasOn ? '/on' : '');

		if (actID in muteActions) {
			muteActions[actID].options[0].choices.push({
				id:    chID + '/',
				label: stripdef[i].description + " " + channelRange(stripdef[i].min, stripdef[i].max, d)
			});
			l = muteActions[actID].options[1].label + ", " + stripdef[i].description;
			muteActions[actID].options[1].label = l;
		} else {
			if (stripdef[i].hasOn == true) {
				if (d>0) {					// one of the channel mutes
					muteActions[actID] = {
						label: "Mute " + stripdef[i].description,
						options: [
							{
								type:	'dropdown',
								label:	'Type',
								id:		'type',
								choices: [ {
									id: 	chID + '/',
									label: stripdef[i].description + " " + channelRange(stripdef[i].min, stripdef[i].max, d)
								} ],
								default: chID + '/'
							},
							{
								type:	'textinput',
								label:	"Which " + stripdef[i].description,
								id:		'num',
								default:'1',
								regex:	self.REGEX_NUMBER
							}
						]
					};
				} else {						// Main LR, Aux/USB
					muteActions[actID] = {
						label: "Mute " + stripdef[i].description,
						options: []
					};
				}
			} else {							// Mute Group
				muteActions[actID] = {
					label: stripdef[i].description,
					options: [
						{
							type:	'textinput',
							label:	stripdef[i].description + " " + channelRange(stripdef[i].min, stripdef[i].max, d),
							id:		'mute_grp',
							default:'1',
							regex:	self.REGEX_NUMBER
						}
					]
				};
			}


			muteActions[actID].options.push( {
				type:	'dropdown',
				label:	'Mute / Unmute',
				id:		'mute',
				default: muteChoice[0],
				choices: [
					{id: muteChoice[0], label: 'Mute'},
					{id: muteChoice[1], label: 'Unmute'},
					{id: '2', 			label: 'Toggle'}
					]
				}
			);
			muteActions[actID].order = i;
		}
		if (d == 0) {
			muteID = chID + sfx;
			mute[muteID] = {
				isOn: false,
				hasOn: stripdef[i].hasOn,
				valid: false,
				feedback: fbID,
				polled: 0
			};
			self.fbToMute[fbID] = muteID;
		} else {
			for (c = stripdef[i].min; c <= stripdef[i].max; c++) {
				muteID = chID + '/' + ('00' + c).slice(-d) + sfx;
				mute[muteID] = {
					isOn: false,
					hasOn: stripdef[i].hasOn,
					valid: false,
					feedback: fbID,
					polled: 0
				};
				self.fbToMute[fbID + '_' + c] = muteID;
			}
		}
		fbDescription = stripdef[i].description + " " + (stripdef[i].hasOn ? "Muted" : "On");
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
				if (theChannel) {
					if (self.mute[self.fbToMute[feedback.type + "_" + theChannel]].isOn !=
					    self.mute[self.fbToMute[feedback.type + "_" + theChannel]].hasOn) {
						return { color: feedback.options.fg, bgcolor: feedback.options.bg };
					}
				} else if ( self.fbToMute[feedback.type] ) {
					if (self.mute[self.fbToMute[feedback.type]].isOn !=
						self.mute[self.fbToMute[feedback.type]].hasOn) {
						return { color: feedback.options.fg, bgcolor: feedback.options.bg };
					}
				}
			}
		};
		if (d>0) {
			muteFeedbacks[fbID].options.push( {
				type: 'number',
				label: stripdef[i].description + ' number',
				id: 'theChannel',
				default: 1,
				min: stripdef[i].min,
				max: stripdef[i].max,
				range: false,
				required: true
			} );
		}
	}
	self.mute = mute;
	self.muteActions = muteActions;
	self.muteFeedbacks = muteFeedbacks;
};

instance.prototype.pollMutes = function () {
	var self = this;
	var stillNeed = false;
	var counter = 0;
	var timeNow = Date.now();
	var timeOut = timeNow - 50;

	for (var id in self.mute) {
		if (!self.mute[id].valid && (self.mute[id].polled < timeOut)) {
			self.sendOSC(id);
			self.debug("sending " + id);
			self.mute[id].polled = timeNow;
			stillNeed = true;
			counter++;
			if (counter > 5) {
				break;
			}
		}
	}
	if (!stillNeed) {
		self.status(self.STATUS_OK,"Mutes loaded");
	}
	self.needMutes = stillNeed;
};

instance.prototype.firstPoll = function () {
	self = this;
	var id;

	self.sendOSC('/xinfo',[]);
	self.sendOSC('/-snap/name',[]);
	self.sendOSC('/-snap/index',[]);
	self.pollMutes();
	self.pulse();
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
			if (node in self.mute) {
				self.mute[node].isOn = (args[0].value == 0 ? false : true);
				self.mute[node].valid = true;
				if (self.needMutes) {
					self.pollMutes();
				}
				self.checkFeedbacks(self.mute[node].feedback);
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
			self.status(self.STATUS_WARNING,"Loading mutes");
			self.firstPoll();
			self.heartbeat = setInterval( function () { self.pulse(); },9500);
		});

		self.oscPort.on('close', function() {
			if (self.heartbeat !== undefined) {
				clearInterval(self.heartbeat);
				self.heartbeat = undefined;
			}
		});

		self.oscPort.on('error', function(err) {
			self.log('error', "Error: " + err.message);
			self.status(self.STATUS_ERROR, err.message);
			if (self.heartbeat !== undefined) {
				clearInterval(self.heartbeat);
				self.heartbeat = undefined;
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
	var i = 0;
	while (i < variables.length) {
		self.setVariable(variables[i].name);
		i++;
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

instance.prototype.fader_val = [

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

instance.prototype.color_val = [
		{ label: 'Off',              id: '0' },
		{ label: 'Red: ',            id: '1' },
		{ label: 'Green',            id: '2' },
		{ label: 'Yellow',           id: '3' },
		{ label: 'Blue',             id: '4' },
		{ label: 'Magenta',          id: '5' },
		{ label: 'Cyan',             id: '6' },
		{ label: 'White',            id: '7' },
		{ label: 'Off Inverted',     id: '8' },
		{ label: 'Red Inverted',     id: '9' },
		{ label: 'Green Inverted',   id: '10' },
		{ label: 'Yellow Inverted',  id: '11' },
		{ label: 'Blue Inverted',    id: '12' },
		{ label: 'Magenta Inverted', id: '13' },
		{ label: 'Cyan Inverted',    id: '14' },
		{ label: 'White Inverted',   id: '15' }
];


instance.prototype.tape_func = [
		{ label: 'STOP',                id: '0' },
		{ label: 'PLAY PAUSE',          id: '1' },
		{ label: 'PLAY',                id: '2' },
		{ label: 'RECORD PAUSE',        id: '3' },
		{ label: 'RECORD',              id: '4' },
		{ label: 'FAST FORWARD',        id: '5' },
		{ label: 'REWIND',              id: '6' }
];

instance.prototype.init_actions = function(system) {
	var self = this;
	var newActions = {};

	Object.assign(newActions, self.muteActions, {

		'fad':     {
			label:        'Set fader level',
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
					type:     'textinput',
					label:    'Channel, Fx Return, Fx Send or Bus Number',
					id:       'num',
					default:  '1',
					regex:    self.REGEX_NUMBER
				},
				{
					type:     'dropdown',
					label:    'Fader Level',
					id:       'fad',
					choices:  self.fader_val
				}
			]
		},

		'send':     {
			label:        'Set ch Sends',
			options: [

				{
					type:     'textinput',
					label:    'Channel Number',
					id:       'chNum',
					default:  '1',
					regex:    self.REGEX_NUMBER
				},
				{
					type:     'textinput',
					label:    'Bus Number',
					id:       'busNum',
					default:  '1',
					regex:    self.REGEX_NUMBER
				},
				{
					type:     'dropdown',
					label:    'Fader Level',
					id:       'fad',
					choices:  self.fader_val
				}
			]
		},

		'mFad':     {
			label:        'Set Main fader level',
			options: [
				{
					type:     'dropdown',
					label:    'Fader Level',
					id:       'fad',
					choices:  self.fader_val
				}
			]
		},

		'usbFad':     {
			label:        'Set USB fader level',
			options: [
				{
					type:     'dropdown',
					label:    'Fader Level',
					id:       'fad',
					choices:  self.fader_val
				}
			]
		},

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
	var nVal;
	var arg = {};

	switch (action.action){

		case 'mute':
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
			if (opt.type == '/dca/') {
				cmd = opt.type + nVal + "/on";
			} else {
				cmd = opt.type + nVal + '/mix/on';
			}
			arg = {
				type: "i",
				value: 2==parseInt(opt.mute) ? 1-self.mute[cmd].isOn : parseInt(opt.mute)
			};
		break;

		case 'mMute':
			cmd = '/lr/mix/on';
			arg = {
				type: "i",
				value: 2==parseInt(opt.mute) ? 1-self.mute[cmd].isOn : parseInt(opt.mute)
			};
		break;

		case 'usbMute':
			cmd = '/rtn/aux/mix/on';
			arg = {
				type: "i",
				value: 2==parseInt(opt.mute) ? 1-self.mute[cmd].isOn : parseInt(opt.mute)
			};
		break;

		case 'fad':
			arg = {
				type: "f",
				value: parseFloat(opt.fad)
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
			cmd = opt.type + nVal + '/mix/fader';
		break;

		case 'send':
			arg = {
				type: "f",
				value: parseFloat(opt.fad)
			};
				if (opt.chNum <= 9){
					nVal = ('0' + parseInt(opt.chNum)).substr(-2);
				}
				if (opt.chNum >= 10) {
					nVal = parseInt(opt.chNum);
				}

			cmd = '/ch/' + nVal + '/mix/' + '0' + opt.busNum + '/level';
		break;

		case 'mFad':
			arg = {
				type: "f",
				value: parseFloat(opt.fad)
			};
			cmd = '/lr/mix/fader';
		break;

		case 'usbFad':
			arg = {
				type: "f",
				value: parseFloat(opt.fad)
			};
			cmd = '/rtn/aux/mix/fader';
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
				type: "i",
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
				type: "i",
				value: parseInt(opt.col)
			};
			cmd = '/lr/config/color';
		break;

		case 'usbColor':
			arg = {
				type: "i",
				value: parseInt(opt.col)
			};
			cmd = '/rtn/aux/config/color';
		break;

		case 'mute_grp':
			cmd = '/config/mute/'+ opt.mute_grp;
			arg = {
				type: "i",
				value: 2==parseInt(opt.mute) ? 1-self.mute[cmd].isOn : parseInt(opt.mute)
			};
		break;

		case 'load_snap':
			arg = {
				type: "i",
				value: parseInt(opt.snap)
			};
			cmd = '/-snap/load';
		break;

		case 'tape':
			arg = {
				type: "i",
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
