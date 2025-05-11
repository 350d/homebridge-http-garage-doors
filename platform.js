module.exports = (homebridge) => {
	return class HttpGarageDoorsPlatform {
		constructor(log, config, api) {
			this.log = log;
			this.config = config;
			this.api = api;
			this.accessories = [];

			const { Service, Characteristic } = api.hap;
			this.Service = Service;
			this.Characteristic = Characteristic;

			api.on('didFinishLaunching', () => {
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
				accessory.getService(this.Service.AccessoryInformation)
					.setCharacteristic(this.Characteristic.Manufacturer, 'METATAG')
					.setCharacteristic(this.Characteristic.Model, 'HTTP_GARAGE_GATES')
					.setCharacteristic(this.Characteristic.SerialNumber, '00000001');

				accessory.addService(this.Service.GarageDoorOpener);
				this.api.registerPlatformAccessories('homebridge-http-garage-doors', 'HttpGarageDoors', [accessory]);
			}
		}
	};
};