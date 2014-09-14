/*
 * Define application configuration
 */
var setting = require('../config/config.json');

setting = setting || {};

setting.server = setting.server || {};
setting.server.port = setting.server.port || 7000;
setting.server.user = setting.server.user || "wifisvc";
setting.server.password = setting.server.password || "1qaz@WSX";

setting.wifi = setting.wifi || {};
setting.wifi.server = setting.wifi.server || "192.168.1.1";
setting.wifi.user = setting.wifi.user || "user";
setting.wifi.password = setting.wifi.password || "beagle";

module.exports = exports = setting;


