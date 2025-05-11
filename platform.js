'use strict';

const { v4: uuidv4 } = require('uuid');

let Service, Characteristic;

class HttpGarageDoorsPlatform {
  constructor(log, config, api) {
    this.log = log;
    this.config = config;
    this.api = api;
    this.accessories = [];

    Service = this.api.hap.Service;
    Characteristic = this.api.hap.Characteristic;

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const name = this.config.name || 'Garage Door';
    const uuid = this.api.hap.uuid.generate(name);
    const existingAccessory = this.accessories.find(a => a.UUID === uuid);

    if (existingAccessory) {
      this.log.info('Restoring accessory from cache:', existingAccessory.displayName);
    } else {
      const accessory = new this.api.platformAccessory(name, uuid);
      accessory.getService(Service.AccessoryInformation)
        .setCharacteristic(Characteristic.Manufacturer, 'METATAG')
        .setCharacteristic(Characteristic.Model, 'HTTP_GARAGE_GATES')
        .setCharacteristic(Characteristic.SerialNumber, '00000001');

      accessory.addService(Service.GarageDoorOpener);
      this.api.registerPlatformAccessories('homebridge-http-garage-doors', 'HttpGarageDoors', [accessory]);
    }
  }
}

module.exports = HttpGarageDoorsPlatform;
