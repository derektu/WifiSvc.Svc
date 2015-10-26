/**
 * Created by Derek on 2014/6/7.
 */

var Scheduler = function(wificmd) {
    var self = this;

    var jobId = 1;

    var scheduler = require('node-schedule');

    // keep Job list that have been scheduled
    //
    var jobItems = {};

    // schedule 可以是一個 date object, 也可以是一個repeat schedule的設定
    //
    var JobItem = function(id, mac, enable, onetime, schedule) {
        this.id = id;
        this.mac = mac;
        this.enable = enable;
        this.onetime = onetime;
        this.schedule = schedule;
        this.job = null;
    };

    // 設定自動開關wifi
    //  return { 'id' : 1, 'mac' : 'mac', 'enable' : true, 'onetime' : true, 'schedule': schedulevalue }
    //
    this.addJob = function(mac, enable, onetime, schedule) {
        console.log('addJob: mac=' + mac + " enable=" + enable + " onetime=", onetime + " at=" + schedule);

        var jobItem = new JobItem(jobId++, mac, enable, onetime, schedule);

        jobItem.job = scheduler.scheduleJob(schedule, function() {
            try {

                // debug purpose
                console.log("EnableMac(" + enable + ',' + mac + ") logged.");

                if (mac != "FF:FF:FF:FF:FF:FF") {
                    wificmd["enableMac"].call(wificmd, mac, enable, function(err, result) {
                        console.log("EnableMac(" + enable + ',' + mac + ") executed. Err=" + err);
                    });
                }
            }
            catch(e) {
                console.log('exception when calling enableMac:' + e.toString());
            }
        });

        // track this job
        //
        jobItems[jobItem.id] = jobItem;

        if (onetime) {
            jobItem.job.on('run', function() {
                delete jobItems[jobItem.id];
            });
        }

        jobItem.job.on('canceled', function() {
            delete jobItems[jobItem.id];
        });

        return jobItem;
    };


    this.cancelJob = function(id) {
        var jobItem = jobItems[id];

        if (typeof(jobItem) != 'undefined') {
            scheduler.cancelJob(jobItem.job);
        }
    };

    this.getPendingJobs = function() {
        var jobs = [];
        Object.keys(jobItems).forEach(function(key) {
            jobs.push(jobItems[key]);
        });

        return jobs;
    }

    // 移除所有尚未完成的job
    //
    this.cancelAllJobs = function() {
        Object.keys(jobItems).forEach(function(key) {
            try {
                jobItems[key].job.cancel();
            }
            catch(e) {
                console.log('exception when calling cancelJob:' + e.toString());
            }
        });
    };
};

module.exports = Scheduler;
