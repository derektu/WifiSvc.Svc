
var chai = require("chai");
var expect = chai.expect;

var config = require("../lib/config.js");
var WifiCmd = require('../lib/wificmd.js');
var Scheduler = require('../lib/wifiScheduler');

var wificmd = new WifiCmd(config.wifi);
var wifiScheduler = new Scheduler(wificmd);

var mac = 'FF:FF:FF:FF:FF:FF';

// # to run single test
// $ mocha test/testwificmd.js --timeout 5000 -g "getConnectionList"
//
describe.skip("test wificmd", function() {

    var _callback = function(err, result, done) {
        if (err != null) {
            console.log('err=' + err);
        }
        else {
            console.log(result);
        }
        done();
    };

    it("getConnectionList", function(done) {
        wificmd.getConnectionList(
            function callback(err, result) { _callback(err, result, done); }
        );
    });

    it("getMacFilterList", function(done) {
        wificmd.getMacFilterList(
            function callback(err, result) { _callback(err, result, done); }
        );
    });

    it("getMacFilterMode", function(done) {
        wificmd.getMacFilterMode(
            function callback(err, result) { _callback(err, result, done); }
        );
    });

    it("setMacFilterMode", function(done) {
         wificmd.setMacFilterMode(
             true,
             function callback(err, result) { _callback(err, result, done); }
         );
    });

    it("addMac", function(done) {
        wificmd.addMac(
            mac,
            function callback(err, result) { _callback(err, result, done); }
        );
    });

    it("removeMac", function(done) {
        wificmd.removeMac(
            mac,
            function callback(err, result) { _callback(err, result, done); }
        );
    });

    it("addSchedule", function(done) {
        var now = new Date();

        // 5 seconds
        var scheduleDate = new Date(now.getTime() + 5*1000);

        var jobItem = wifiScheduler.addJob(mac, true, scheduleDate);
        console.log(jobItem);

        var jobs = wifiScheduler.getPendingJobs();
        expect(jobs.length).to.be.equal(1);

        console.log(jobs);

        setTimeout(function() {
            var jobs = wifiScheduler.getPendingJobs();
            expect(jobs.length).to.be.equal(0);
            done();
        }, 10 * 1000);
    });

    it("addAndCancelSchedule", function(done) {
        var now = new Date();
        // 5 seconds
        var scheduleDate = new Date(now.getTime() + 5*1000);

        var jobItem = wifiScheduler.addJob(mac, true, scheduleDate);
        console.log(jobItem);

        setTimeout(function() {
            wifiScheduler.cancelJob(jobItem.id);
            console.log('job:' + jobItem.id + ' is canceled.');

            var jobs = wifiScheduler.getPendingJobs();
            expect(jobs.length).to.be.equal(0);

        }, 1000);

        setTimeout(function() {
            var jobs = wifiScheduler.getPendingJobs();
            expect(jobs.length).to.be.equal(0);

            done();
        }, 5 * 1000);
    });

    it("cancelAllSchedule", function(done) {
        var now = new Date();
        // 10 seconds
        var scheduleDate = new Date(now.getTime() + 5*1000);

        var jobItem1 = wifiScheduler.addJob(mac, true, scheduleDate);
        console.log(jobItem1);

        var jobItem2 = wifiScheduler.addJob(mac, false, scheduleDate);
        console.log(jobItem2);

        setTimeout(function() {
            wifiScheduler.cancelAllJobs();

            var jobs = wifiScheduler.getPendingJobs();
            expect(jobs.length).to.be.equal(0);

        }, 1000);

        setTimeout(function() {
            var jobs = wifiScheduler.getPendingJobs();
            expect(jobs.length).to.be.equal(0);

            done();
        }, 5 * 1000);
    });
});





