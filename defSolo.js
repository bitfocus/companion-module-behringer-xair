export const defSolo = [
	{
		id: 'solosw',
		prefix: '/-stat/solosw/',
		cmdMap: [
			{
				description: 'Channel',
				actID: 'ch',
				min: 1,
				max: 16,
				offset: 0,
			},
			{
				description: 'Aux/USB',
				actID: 'aux',
				min: 1,
				max: 1,
				offset: 16,
			},
			{
				description: 'FX Return',
				actID: 'fxr',
				min: 1,
				max: 4,
				offset: 17,
			},
			{
				description: 'Bus Master',
				actID: 'bus',
				min: 1,
				max: 6,
				offset: 39,
			},
			{
				description: 'FX Master',
				actID: 'fxs',
				min: 1,
				max: 4,
				offset: 45,
			},
			{
				description: 'Master LR',
				actID: 'lr',
				min: 1,
				max: 1,
				offset: 49,
			},
			{
				description: 'DCA',
				actID: 'dca',
				min: 1,
				max: 4,
				offset: 50,
			},
		],
	},
	{
		id: 'config',
		prefix: '/config/solo/',
		comment: "the following actID will be prefixed with 'solo_'",
		cmdMap: [
			{
				actID: 'level',
				description: 'Level',
				isFader: true,
				fadeType: 161,
			},
			{
				actID: 'sourcetrim',
				description: 'Source Trim',
				isFader: true,
				fadeType: 73,
			},
			{
				actID: 'dimatt',
				description: 'Dim Gain/Att',
				isFader: true,
				fadeType: 40,
			},
			{
				actID: 'mute',
				description: 'Mute',
				isFader: false,
				bg: [128, 0, 0],
			},
			{
				actID: 'mono',
				description: 'Mono',
				isFader: false,
				bg: [0, 150, 200],
			},
			{
				actID: 'dim',
				description: 'Dim',
				isFader: false,
				bg: [0, 150, 200],
			},
		],
	},
	{
		id: 'action',
		prefix: '/-action/',
		cmdMap: [
			{
				actID: 'clearsolo',
				description: 'Solo Clear',
				statID: '/-stat/solo',
				statDesc: 'Any Solo Active',
				bg: [168, 0, 0],
				isFader: false,
			},
		],
	},
]
