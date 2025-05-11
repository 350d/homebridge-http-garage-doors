'use strict';

const AccessoryImpl = require('./accessory');

let Service, Characteristic;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	homebridge.registerAccessory('homebridge-http-garage-doors', 'HttpGarageDoors', AccessoryImpl);
};
