/**
 * Created by Derek on 2014/6/7.
 */


var express = require('express');
var basicAuth = require('basic-auth-connect');
var WifiCmd = require('./wificmd.js');
var WifiScheduler = require('./wifiScheduler.js');

var Server = function(options, jobSchedule) {

    var self = this;

    var serverConfig = options.server || { port: 7000, auth: true, user: "wifisvc", password: "1qaz@WSX" };

    var wifiConfig = options.wifi || { server: "192.168.1.1", user: "user", password: "beagle"};

    var wificmd = new WifiCmd(wifiConfig);
    var wifiScheduler = new WifiScheduler(wificmd);
    var expressServer = express();

    var deviceMgr = require('./deviceMgr.js');

    if (jobSchedule != null) {
        setupJobSchedule(jobSchedule);
    }

    this.run = function() {
        expressServer.listen(serverConfig.port);
    };

    serverConfig.auth = serverConfig.auth || true;
    if (serverConfig.auth && serverConfig.user != "") {
        expressServer.use(basicAuth(serverConfig.user, serverConfig.password));
    }

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

                res.writeHead(200, { 'Content-type': 'application/json'});

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
            api_getMacFilterList(req, res);
        }
        catch(e) {
            res.send(500, 'Error=' + e.toString());
            res.end();
        }
    });

    function api_getMacFilterList(req, res) {
        wificmd.getMacFilterList(
            function(err, result) {
                if (err) {
                    res.writeHead(500);
                    res.end();
                    return;
                }

                res.writeHead(200, { 'Content-type': 'application/json'});
                var ret = [];

                // cycle thru each known devices
                //
                deviceMgr.getDeviceList().forEach(function(device) {
                    var i;
                    var deviceItem = {};
                    for (i = 0; i < result.length; i++) {
                        if (result[i] != null && (result[i].mac.toUpperCase() == device.mac.toUpperCase())) {
                            deviceItem.mac = device.mac;
                            deviceItem.name = device.name;
                            deviceItem.enable = true;
                            ret.push(deviceItem);
                            result[i] = null; // remove from result
                            return;
                        }
                    }

                    // device is not enabled !!
                    //
                    deviceItem.mac = device.mac;
                    deviceItem.name = device.name;
                    deviceItem.enable = false;
                    ret.push(deviceItem);
                });

                // console.log(result);

                // Undefined devices
                //
                result.forEach(function(node) {
                    if (node != null) {
                        var deviceItem = {};
                        deviceItem.mac = node.mac;
                        deviceItem.name = node.mac;
                        deviceItem.enable = true;
                        ret.push(deviceItem);
                    }
                });

                outputJson(res, req.query, ret);
                res.end();
            }
        );
    }

    expressServer.get("/api/getmacfiltermode", function(req, res) {

    });

    expressServer.get("/api/setmacfiltermode", function(req, res) {

    });

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

            var autorevert = parseInt(req.param("autorevert") || "0");

            api_macfilter(req, res, mac, enable == "1", autorevert);
        }
        catch(e) {
            res.send(500, 'Error=' + e.toString());
            res.end();
        }
    });

    function api_macfilter(req, res, mac, add, autorevert) {
        // Output are returned immediately, otherwise website will be unavailable when mac filter list is changed
        //

        if (autorevert) {
            wifiScheduler.addJob(mac, !add, new Date((new Date()).getTime() + autorevert * 60000));
        }

        res.writeHead(200, { 'Content-type': 'application/json'});
        outputJson(res, req.query, { mac: mac });
        res.end();

        setTimeout(function() {
            var fn = add ? wificmd["addMac"] : wificmd["removeMac"];
            fn.call(wificmd, mac, function(err, result) {
                console.log('addmac callback: err=' + err + ' result=' + result);
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

            res.writeHead(200, { 'Content-type': 'application/json'});
            outputJson(res, req.query, job2Json(job));
        }
        catch(e) {
            res.send(500, 'Error=' + e.toString());
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

            res.writeHead(200, { 'Content-type': 'application/json'});
            outputJson(res, req.query, job2Json(job));
        }
        catch(e) {
            res.send(500, 'Error=' + e.toString());
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

            res.writeHead(200, { 'Content-type': 'application/json'});
            outputJson(res, req.query, {});
        }
        catch(e) {
            res.send(500, 'Error=' + e.toString());
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

            res.writeHead(200, { 'Content-type': 'application/json'});
            outputJson(res, req.query, {});
        }
        catch(e) {
            res.send(500, 'Error=' + e.toString());
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

            res.writeHead(200, { 'Content-type': 'application/json'});
            outputJson(res, req.query, result);
        }
        catch(e) {
            res.send(500, 'Error=' + e.toString());
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
};

module.exports = Server;
