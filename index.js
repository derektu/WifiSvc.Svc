/**
 * Created by Derek on 2014/6/7.
 */


var options = require('./lib/config.js');
var jobSchedule = require('./config/jobSchedule.json');
var Server = require('./lib/server.js');

new Server(options, jobSchedule).run();


