'use strict';

const axios = require('axios');

var Service, Characteristic;

module.exports = function (homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  homebridge.registerAccessory('homebridge-http-garage-doors', 'HttpGarageDoors', HttpGarageDoorsAccessory);
};

class HttpGarageDoorsAccessory {
  constructor (log, config) {
    this.log = log;

    this.debug = config['debug'];

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
    if (this.debug) this.log('getServices...');
    return [this.informationService, this.service];
  }

  setupGarageDoorOpenerService (service) {
    service.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
    service.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);

    service.getCharacteristic(Characteristic.CurrentDoorState)
      .on('get', (callback) => {
        var cds = service.getCharacteristic(Characteristic.CurrentDoorState).value;
        if (this.debug) this.log('getCurrentDoorState() ' + cds);
        callback(null, cds);
      });

    service.getCharacteristic(Characteristic.TargetDoorState)
      .on('get', (callback) => {
        var tds = service.getCharacteristic(Characteristic.TargetDoorState).value;
        if (this.debug) this.log('getTargetDoorState() ' + tds);
        if (tds === Characteristic.TargetDoorState.OPEN &&
          (((new Date()) - this.lastOpened) >= (this.closeAfter * 1000))) {
          if (this.debug) this.log('Setting TargetDoorState to CLOSED');
          callback(null, Characteristic.TargetDoorState.CLOSED);
        } else {
          callback(null, tds);
        }
      })
      .on('set', (value, callback) => {
        if (this.debug) this.log('setTargetDoorState() ' + value);
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
          this.log('Door closed');
        }, this.simulateTimeClosing * 1000);
      }, this.simulateTimeOpen * 1000);
    }, this.simulateTimeOpening * 1000);
  }

  httpRequest(request, callback) {

    var headers_object = {
        'User-Agent': 'Homebridge'
    },
        params_object = {},
        body, json = false,
        query_params = [];

    if (this.debug) this.log('Check for request params...');

    if (request.params) {
      for (const key in request.params) {
        params_object[request.params[key].name] = request.params[key].value;
        query_params.push(encodeURIComponent(param.name) + "=" + encodeURIComponent(param.value));
      };
    }

    if (this.debug) {
      this.log('Check for request headers...');
    }

    if (request.headers) {
      for (const key in request.headers) {
        headers_object[request.headers[key].name] = request.headers[key].value;
      };
    }

    if (this.debug) {
      this.log('Check for request type...');
      this.log(request.type);
    }

    if (request.type && request.type.toUpperCase() == 'JSON') {
      json = true;
      body = query_params.length ? params_object : false;
    } else {
      if (request.method.toUpperCase() == 'GET') {
        //if (query_params.length) request.url = request.url + (request.url.indexOf('?') < 0 ? '?' : '&') + query_params.join('&');
      }
      
    }

    if (this.debug) this.log('Prepare httpRequest Config');
/*
    var config = {
      url: request.url,
      method: request.method || 'GET',
      headers: headers_object || {},
      auth: false,
      //followRedirect: false,
      //simple: false,
      //resolveWithFullResponse: true
    };
*/
    var config = {
      method: request.method || 'GET',
      url: request.url,
      headers: headers_object,
      params: config.method === 'GET' ? params_object : undefined,
      data: config.method !== 'GET' && query_params.length ? params_object : undefined,
      timeout: 5000,
      validateStatus: () => true
    };

    //if (json) config.json = true;
    //if (body) config.body = body;

    if (this.debug) {
      this.log('httpRequest Config');
      this.log(config);
    }


    axios(config)
      .then(response => {
        this.log('Response status:', response.status);
        this.log('Response body:', response.data);
        callback(null, response, response.data);
      })
      .catch(error => {
        this.log('Axios request error:', error.message);
        callback(error);
      });
    /*
    http_request(config, (error, response, body) => {
      if (this.debug) {
        if (!error && response.statusCode == 200) {
          this.log('Response Body');
          this.log(body);
        } else {
          this.log('Request Error');
          this.log(error);
          this.log('Request Error Body');
          this.log(body);
        }
      }
      callback(error, response, body);
    });
    */
  }


}
