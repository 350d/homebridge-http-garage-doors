'use strict';

const http_request = require("request");

var Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-http-garage-doors', 'HttpGarageDoors', HttpGarageDoorsAccessory);
};

class HttpGarageDoorsAccessory {
  constructor (log, config) {
    this.log = log;

    this.request = config['request'];

    this.closeAfter = config['closeAfter'];
    this.lastOpened = new Date();

    this.simulateTimeOpening = config['simulateTimeOpening'];
    this.simulateTimeOpen = config['simulateTimeOpen'];
    this.simulateTimeClosing = config['simulateTimeClosing'];

    this.service = new Service.GarageDoorOpener(config['name'], config['name']);
    this.setupGarageDoorOpenerService(this.service);

    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, 'METATAG')
      .setCharacteristic(Characteristic.Model, 'HTTP_GARAGE_GATES')
      .setCharacteristic(Characteristic.SerialNumber, '00000001');
  }

  getServices () {
    return [this.informationService, this.service];
  }

  setupGarageDoorOpenerService (service) {
    this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);

    service.getCharacteristic(Characteristic.TargetDoorState)
      .on('get', (callback) => {
        var tds = service.getCharacteristic(Characteristic.TargetDoorState).value;
        if (tds === Characteristic.TargetDoorState.OPEN &&
          (((new Date()) - this.lastOpened) >= (this.closeAfter * 1000))) {
          this.log('Setting TargetDoorState to CLOSED');
          callback(null, Characteristic.TargetDoorState.CLOSED);
        } else {
          callback(null, tds);
        }
      })
      .on('set', (value, callback) => {
        if (value === Characteristic.TargetDoorState.OPEN) {
          this.lastOpened = new Date();
          switch (service.getCharacteristic(Characteristic.CurrentDoorState).value) {
            case Characteristic.CurrentDoorState.CLOSED:
            case Characteristic.CurrentDoorState.CLOSING:
            case Characteristic.CurrentDoorState.OPEN:
              this.openDoor(callback);
              break;
            default:
              callback();
          }
        } else {
          callback();
        }
      });
  }

  openDoor (callback) {
    this.sendRequest(this.request, callback);
  }

  sendRequest (request, callback) {
    this.httpRequest(request, (error, response, body) => {
      this.simulateDoorOpening(callback);
    });
  }

  simulateDoorOpening (callback) {
    this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPENING);
    this.log('Opening Door');
    setTimeout(() => {
      this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
      this.log('Door open');
      callback();
      setTimeout(() => {
        this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSING);
        this.service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
        this.log('Closing door');
        setTimeout(() => {
          this.service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
          this.log('Dooe closed');
        }, this.simulateTimeClosing * 1000);
      }, this.simulateTimeOpen * 1000);
    }, this.simulateTimeOpening * 1000);
  }

  httpRequest(request, callback) {

    var headers_object = {},
        params_object = {},
        body, json = false;

    if (request.params.length) {
      request.params.map(function(param){
        params_object[param.name] = param.value;
      });
    }

    if (request.headers.length) {
      request.headers.map(function(header){
        headers_object[header.name] = header.value;
      });
    }

    if (request.type.toUpperCase() == 'JSON') {
      json = true;
      body = params_object;
    } else {
      json = false;
      body = new URLSearchParams(params_object).toString();
    }

    var config = {
      url: request.url,
      json: json,
      body: body,
      method: request.method || 'GET',
      headers: headers_object || {},
    };
    this.log('httpRequest Config');
    this.log(config);
    
    http_request(config, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        this.log('Response Body');
        this.log(body);
      } else {
        this.log('Request Error');
        this.log(error);
        this.log('Request Error Body');
        this.log(body);
      }
      callback(error, response, body);
    });
  }


}
