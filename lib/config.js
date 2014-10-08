/*
 * Define application configuration
 */
var setting = require('../config/config.json');

setting = setting || {};

setting.server = setting.server || {};
setting.server.port = setting.server.port || 7000;
setting.server.user = setting.server.user || "wifisvc";
setting.server.password = setting.server.password || "1qaz@WSX";

module.exports = exports = setting;


