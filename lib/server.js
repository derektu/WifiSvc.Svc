/**
 * Created by Derek on 2014/6/7.
 */


var _ = require('underscore');
var express = require('express');
var cors = require('cors');
var basicAuth = require('basic-auth-connect');
var morgan = require('morgan');
var WifiCmd = require('./wificmd.js');
var WifiScheduler = require('./wifiScheduler.js');

var Server = function(options, jobSchedule) {

    var self = this;

    var serverConfig = options.server || { port: 7000, auth: true, user: "wifisvc", password: "1qaz@WSX" };

    var wifiConfig = options.wifi || { server: "192.168.1.1", user: "user", password: "beagle"};

    var wificmd = new WifiCmd(wifiConfig);
    var wifiScheduler = new WifiScheduler(wificmd);
    var expressServer = express();

    expressServer.use(cors());
    expressServer.use(morgan('common'));

    var deviceMgr = require('./deviceMgr.js');

    if (jobSchedule != null) {
        setupJobSchedule(jobSchedule);
    }

    this.run = function() {
        expressServer.listen(serverConfig.port);
    };

    if (serverConfig.auth && serverConfig.user != "") {
        expressServer.use(basicAuth(serverConfig.user, serverConfig.password));
    }

    var webFolder = __dirname + '/../../Web';
    expressServer.use(express.static(webFolder));


    // api: getconnectionlist
    // return:
    //		[ { 'mac':'...', 'name':'..', 'duration':'...' }, { 'mac':'...', 'name':'..', 'duration':'...' } ]
    //
    expressServer.get("/api/getconnectionlist", function(req, res) {
        try {
            api_getConnectionList(req, res);
        }
        catch(e) {
            res.send(500, 'Error=' + e.toString());
            res.end();
        }
    });

    function setupJobSchedule(jobSchedule) {
        jobSchedule.forEach(function(job) {
            job.scheduleList.forEach(function(schedule) {
                wifiScheduler.addJob(job.mac, job.enable, false, schedule);
            });
        });
    }

    function api_getConnectionList(req, res) {
        wificmd.getConnectionList(
            function(err, result) {
                if (err) {
                    res.writeHead(500);
                    res.end();
                    return;
                }

                outputJsonHeader(res);

                var ret = [];
                result.forEach(function(node) {
                    var deviceName = deviceMgr.getDeviceName(node.mac);
                    if (deviceName == "")
                        deviceName = node.mac;
                    ret.push({mac:node.mac, name: deviceName, duration:node.duration});
                });

                outputJson(res, req.query, ret);

                res.end();
            }
        );
    }

    // api: getmacfilterlist
    // return:
    //		[ { 'mac':'...', 'name':'..', 'enable':true }, { 'mac':'...', 'name':'..', 'enable':true } ]
    //
    expressServer.get("/api/getmacfilterlist", function(req, res) {
        try {
            api_getMacFilterList(req, res, false);
        }
        catch(e) {
            res.status(500).send('Error=' + e);
            res.end();
        }
    });

    // api: getmacfilterlist
    // return:
    //		{ filterMode: 1, deviceList: [ { 'mac':'...', 'name':'..', 'enable':true }, { 'mac':'...', 'name':'..', 'enable':true } ]}
    //
    expressServer.get("/api/getmacfilterlist2", function(req, res) {
        try {
            api_getMacFilterList(req, res, true);
        }
        catch(e) {
            res.status(500).send('Error=' + e);
            res.end();
        }
    });

    function api_getMacFilterList(req, res, v2) {
        wificmd.getMacFilterList(
            function(err, result) {
                if (err) {
                    res.status(500).send('Error=' + err);
                    res.end();
                    return;
                }
                else if (result == null || result.macList == null || result.macList.length == 0) {
                    res.status(500).send('系統狀態更改中，請稍後。');
                    res.end();
                    return;
                }

                outputJsonHeader(res);

                var ret = { filterMode: result.filterMode, deviceList:[] };

                // cycle thru each known devices
                //
                _.each(deviceMgr.getDeviceList(), function(device) {
                    var macFound = _.find(result.macList, function(mac) {
                        return mac.toUpperCase() == device.mac.toUpperCase();
                    });

                    if (macFound) {
                        ret.deviceList.push({
                            mac: device.mac,
                            name: device.name,
                            enable: true
                        });

                        result.macList = _.without(result.macList, macFound);
                    }
                    else {
                        ret.deviceList.push({
                            mac: device.mac,
                            name: device.name,
                            enable: false
                        });
                    }
                });

                // Undefined devices
                //
                _.each(result.macList, function(node) {
                    ret.deviceList.push({
                        mac: node.mac,
                        name: node.mac,
                        enable: true
                    });
                });

                outputJson(res, req.query, v2 ? ret : ret.deviceList);
                res.end();
            }
        );
    }

    // api: getmacfiltermode
    //
    // return:
    //      { 'filtermode':'1' }
    //
    expressServer.get("/api/getmacfiltermode", function(req, res) {
        try {
            api_getmacfiltermode(req, res);
        }
        catch(e) {
            res.status(500).send('Error=' + e);
            res.end();
        }
    });

    function api_getmacfiltermode(req, res) {
        wificmd.getMacFilterMode(function(err, result) {
            if (err != null) {
                res.status(500).send('Error=' + err);
                res.end();
            }
            else {
                outputJson(res, req.query, {filtermode: result ? 1 : 0});
                res.end();
            }
        });
    }

    // api: setmacfiltermode?mode=0
    //
    // return:
    //      { 'filtermode':'1' }
    //
    expressServer.get("/api/setmacfiltermode", function(req, res) {
        try {
            var mode = req.param("mode") || "";
            if (mode == "")
                throw "Invalid mode parameter";

            api_setmacfiltermode(req, res, mode == "1");
        }
        catch(e) {
            res.status(500).send('Error=' + e);
        }
    });

    function api_setmacfiltermode(req, res, enable) {
        wificmd.setMacFilterMode(enable, function(err, result) {
            if (err != null) {
                res.status(500).send('Error=' + err);
                res.end();
            }
            else {
                outputJson(res, req.query, {filtermode: enable ? 1 : 0});
                res.end();
            }
        });
    }

    // api: enablemacfilter?mac=...&enable=1&autorevert=..
    // return:
    //      { 'mac':'...' }
    //
    expressServer.get("/api/enablemacfilter", function(req, res) {
        try {
            var mac = req.param("mac") || "";
            if (mac == "")
                throw "Invalid mac parameter";

            var enable = req.param("enable") || "";
            if (enable == "")
                throw "Invalid enable parameter";

            var autorevert = parseInt(req.param("autorevert"));
            if (isNaN(autorevert))
                autorevert = 0;

            api_macfilter(req, res, mac, enable == "1", autorevert);
        }
        catch(e) {
            res.status(500).send('Error=' + e);
            res.end();
        }
    });

    function api_macfilter(req, res, mac, add, autorevert) {
        // Output are returned immediately, otherwise website will be unavailable when mac filter list is changed
        //

        if (autorevert > 0) {
            wifiScheduler.addJob(mac, !add, true, new Date((new Date()).getTime() + autorevert * 60000));
        }

        outputJsonHeader(res);
        outputJson(res, req.query, { mac: mac });
        res.end();

        setTimeout(function() {
            var fn = add ? wificmd["addMac"] : wificmd["removeMac"];
            fn.call(wificmd, mac, function(err, result) {
                console.log('addmac/removemac callback: err=' + err + ' result=' + result);
            });
        }, 500);
    }

    function outputJson(response, query, obj) {
        var callback = query['callback'];
        if (typeof(callback) != 'undefined') {
            response.write(callback + '(' + JSON.stringify(obj) + ')');
        }
        else {
            response.write(JSON.stringify(obj));
        }
    }

    // api: addjob?mac=...&enable=..&minute=N
    // return:
    //      { 'id': '..', 'mac':'...', 'enable':'true', 'onetime':'true', 'schedule':'...' }
    //
    expressServer.get("/api/addjob", function(req, res) {
        try {
            var mac = req.param("mac") || "";
            if (mac == "")
                throw "Invalid mac parameter";

            var enable = parseInt(req.param("enable") || "1") > 0;
            var minute = parseInt(req.param("minute" || "30"));

            var now = new Date();
            var scheduleDate = new Date(now.getTime() + minute * 60000);
            var job = wifiScheduler.addJob(mac, enable, true, scheduleDate);

            outputJsonHeader(res);
            outputJson(res, req.query, job2Json(job));
        }
        catch(e) {
            res.status(500).send('Error=' + e);
        }
        finally {
            res.end();
        }
    });

    // api: addrepeatjob?mac=...&enable=..&dw=..&hour=&minute=..
    // return:
    //      { 'id': '..', 'mac':'...', 'enable':'true', 'onetime':'false', 'schedule':'...' }
    //
    expressServer.get("/api/addrepeatjob", function(req, res) {
        try {
            var mac = req.param("mac") || "";
            if (mac == "")
                throw "Invalid mac parameter";

            var enable = parseInt(req.param("enable") || "1") > 0;

            var dayofweek = parseInt(req.param("dw"));
            var hour = parseInt(req.param("hour"));
            var minute = parseInt(req.param("minute"));

            var minute = parseInt(req.param("minute" || "30"));

            var schedule = { dayOfWeek : dayofweek, hour: hour, minute: minute };
            var job = wifiScheduler.addJob(mac, enable, false, schedule);

            outputJsonHeader(res);
            outputJson(res, req.query, job2Json(job));
        }
        catch(e) {
            res.status(500).send('Error=' + e);
        }
        finally {
            res.end();
        }
    });

    // api: canceljob?id=..
    // return: {}
    //
    expressServer.get("/api/canceljob", function(req, res) {
        try {
            var id = req.param("id") || "";
            if (id == "")
                throw "Invalid id parameter";

            wifiScheduler.cancelJob(parseInt(id));

            outputJsonHeader(res);
            outputJson(res, req.query, {});
        }
        catch(e) {
            res.status(500).send('Error=' + e);
        }
        finally {
            res.end();
        }
    });

    // api: cancelalljobs
    // return: {}
    //
    expressServer.get("/api/cancelalljobs", function(req, res) {
        try {
            wifiScheduler.cancelAllJobs();

            outputJsonHeader(res);
            outputJson(res, req.query, {});
        }
        catch(e) {
            res.status(500).send('Error=' + e);
        }
        finally {
            res.end();
        }
    });

    // api: getjoblist
    // return: [ { 'id':.., 'mac':.., 'enable':.., 'date':.. }, { .. } ]
    //
    expressServer.get("/api/getjoblist", function(req, res) {
        try {
            var jobs = wifiScheduler.getPendingJobs();

            var result = [];
            jobs.forEach(function(job) {
                result.push(job2Json(job));
            });

            outputJsonHeader(res);
            outputJson(res, req.query, result);
        }
        catch(e) {
            res.status(500).send('Error=' + e);
        }
        finally {
            res.end();
        }
    });

    function job2Json(job) {
        return { id: job.id,
            mac: job.mac,
            enable: job.enable,
            onetime: job.onetime,
            schedule: job.onetime ? job.schedule.toISOString() : job.schedule
        };
    }

    function outputJsonHeader(res) {
        res.writeHead(200, { 'Content-type': 'application/json'});
    }
};

module.exports = Server;
