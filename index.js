'use strict';

const AccessoryImpl = require('./accessory');
const PlatformImpl = require('./platform');

let Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-http-garage-doors', 'HttpGarageDoors', AccessoryImpl);
  homebridge.registerPlatform('homebridge-http-garage-doors', 'HttpGarageDoors', PlatformImpl);
};
