'use strict';

module.exports = function (homebridge) {
  homebridge.registerAccessory('homebridge-http-garage-doors', 'HttpGarageDoors', function(log, config) {
    return new (require('./accessory'))(log, config, homebridge.hap);
  });
};