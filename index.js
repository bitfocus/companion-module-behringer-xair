var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;
	// super-constructor
	instance_skel.apply(this, arguments);
	self.actions(); // export actions
	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;
};

instance.prototype.init = function() {
	var self = this;
	self.status(self.STATE_OK); // status ok!
	debug = self.debug;
	log = self.log;
};

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			tooltip: 'The IP of the Mr / Xr console',
			width: 6,
			regex: self.REGEX_IP
		}
	]
};

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;
	debug("destory", self.id);;
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

instance.prototype.actions = function(system) {
	var self = this;
	self.system.emit('instance_actions', self.id, {

		'mute':     {
			label:      'Set mute',
			options: [
				{
					type:     'dropdown',
					label:    'Type',
					id:       'type',
					choices:  [
						{ id: '/ch/',      label: 'Channel 01-16' },
						{ id: '/rtn/',     label: 'Fx Return 1-4' },
						{ id: '/fxsend/',  label: 'Fx Send 1-4'  },
						{ id: '/bus/',     label: 'Bus 1-6'  }
					],
					default: '/ch/'
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
					label:    'Mute / Unmute',
					id:       'mute',
					choices:  [ { id: '0', label: 'Mute' }, { id: '1', label: 'Unmute' } ]
				},
			]
		},

		'mMute':     {
			label:        'Set Main mute',
			options: [
				{
					type:     'dropdown',
					label:    'Mute / Unmute',
					id:       'mute',
					choices:  [ { id: '0', label: 'Mute' }, { id: '1', label: 'Unmute' } ]
				},
			]
		},

		'usbMute':     {
			label:        'Set USB mute',
			options: [
				{
					type:     'dropdown',
					label:    'Mute / Unmute',
					id:       'mute',
					choices:  [ { id: '0', label: 'Mute' }, { id: '1', label: 'Unmute' } ]
				},
			]
		},

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

		'mute_grp':     {
			label:     'Mute Group ON/OFF',
			options: [
				{
					type:    'textinput',
					label:   'Mute Group Number (1-4)',
					id:      'mute_grp',
					default: '1',
					regex: self.REGEX_NUMBER
				},
				{
					type:    'dropdown',
					label:   'Mute / Unmute',
					id:      'mute',
					choices: [ { id: '1', label: 'Mute' }, { id: '0', label: 'Unmute' } ]
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
}

instance.prototype.action = function(action) {
	var self = this;
	var cmd
	var opt = action.options
	var nVal


	switch (action.action){

		case 'mute':
			var arg = {
				type: "i",
				value: parseInt(opt.mute)
			};
			if (opt.type == '/ch/') {
				if (opt.num <= 9){
					nVal = ('0' + parseInt(opt.num)).substr(-2)
				}
				if (opt.num >= 10) {
					nVal = parseInt(opt.num)
				}
			}
			if (opt.type != '/ch/') {
				nVal = parseInt(opt.num)
			}

			cmd = opt.type + nVal + '/mix/on';
		break;

		case 'mMute':
			var arg = {
				type: "i",
				value: parseInt(opt.mute)
			};
			cmd = '/lr/mix/on';
		break;

		case 'usbMute':
			var arg = {
				type: "i",
				value: parseInt(opt.mute)
			};
			cmd = '/rtn/aux/mix/on';
		break;

		case 'fad':
			var arg = {
				type: "f",
				value: parseFloat(opt.fad)
			};
			if (opt.type == '/ch/') {
				if (opt.num <= 9){
					nVal = ('0' + parseInt(opt.num)).substr(-2)
				}
				if (opt.num >= 10) {
					nVal = parseInt(opt.num)
				}
			}
			if (opt.type != '/ch/') {
				nVal = parseInt(opt.num)
			}
			cmd = opt.type + nVal + '/mix/fader';
		break;

		case 'send':
			var arg = {
				type: "f",
				value: parseFloat(opt.fad)
			};
				if (opt.chNum <= 9){
					nVal = ('0' + parseInt(opt.chNum)).substr(-2)
				}
				if (opt.chNum >= 10) {
					nVal = parseInt(opt.chNum)
				}

			cmd = '/ch/' + nVal + '/mix/' + '0' + opt.busNum + '/level';
		break;

		case 'mFad':
			var arg = {
				type: "f",
				value: parseFloat(opt.fad)
			};
			cmd = '/lr/mix/fader';
		break;

		case 'usbFad':
			var arg = {
				type: "f",
				value: parseFloat(opt.fad)
			};
			cmd = '/rtn/aux/mix/fader';
		break;

		case 'label':
			var arg = {
				type: "s",
				value: "" + opt.lab
			};
			if (opt.type == '/ch/') {
				if (opt.num <= 9){
					nVal = ('0' + parseInt(opt.num)).substr(-2)
				}
				if (opt.num >= 10) {
					nVal = parseInt(opt.num)
				}
			}
			if (opt.type != '/ch/') {
				nVal = parseInt(opt.num)
			}
			cmd = opt.type + nVal + '/config/name';
		break;

		case 'mLabel':
			var arg = {
				type: "s",
				value: "" + opt.lab
			};
			cmd = '/lr/config/name';
		break;

		case 'usbLabel':
			var arg = {
				type: "s",
				value: "" + opt.lab
			};
			cmd = '/rtn/aux/config/name';
		break;

		case 'color':
		var arg = {
			type: "i",
			value: parseInt(opt.col)
		};
		if (opt.type == '/ch/') {
			if (opt.num <= 9){
				nVal = ('0' + parseInt(opt.num)).substr(-2)
			}
			if (opt.num >= 10) {
				nVal = parseInt(opt.num)
			}
		}
		if (opt.type != '/ch/') {
			nVal = parseInt(opt.num)
		}
		cmd = opt.type + nVal + '/config/color';
		break;

		case 'mColor':
		var arg = {
			type: "i",
			value: parseInt(opt.col)
		};
		cmd = '/lr/config/color';
		break;

		case 'usbColor':
		var arg = {
			type: "i",
			value: parseInt(opt.col)
		};
		cmd = '/rtn/aux/config/color';
		break;

		case 'mute_grp':
			var arg = {
				type: "i",
				value: parseInt(opt.mute)
			};
			cmd = '/config/mute/'+ opt.mute_grp;
		break;

		case 'load_snap':
			var arg = {
				type: "i",
				value: parseInt(opt.snap)
			};
			cmd = '/-snap/load';
		break;

		case 'tape':
			var arg = {
				type: "i",
				value: parseInt(opt.tFunc)
			};
			cmd = '/-stat/tape/state';
		break;
	}

	if (cmd !== undefined) {
		self.system.emit('osc_send', self.config.host, 10024,cmd  ,[arg]);
		debug (cmd, arg);
	}



};

instance_skel.extendedBy(instance);
exports = module.exports = instance;
