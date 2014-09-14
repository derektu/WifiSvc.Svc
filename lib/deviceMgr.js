/**
 * Define list of known devices 
 */

function DeviceMgr() {

	var _list = require('../config/device.json');
	var _macmap = null;
	var _self = this;

	// private function to populate a map: key=mac, value=name
	//
	function initMacMap() {
		if (_macmap != null)
			return;
		
		_macmap = {};
		
		_list.devices.forEach(function(device) {
			_macmap[device.mac.toUpperCase()] = device.name;
		});
	}

	/*
		Return name of this mac. "" is returned if mac is not defined.
	*/
	this.getDeviceName = function(mac) {
		initMacMap();
	
		var value = _macmap[mac.toUpperCase()];
		if (typeof(value) != 'undefined')
			return value;
		else
			return "";
	}

	this.getDeviceList = function() {
		return _list.devices;
	}	
} 

module.exports = new DeviceMgr();


