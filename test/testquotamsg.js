/**
 * Created by Derek on 2014/9/14.
 */

var chai = require("chai");
var expect = chai.expect;
var assert = chai.assert;
require('date-utils');

var QuotaMgr = require('../lib/quotamgr.js');

describe("test quoteMgr", function() {

    var dirname = __dirname;
    var configname = dirname + "/../config/quota.json";
    var dbname = dirname + "/../data/quota.db";
    var quotaMgr = new QuotaMgr({config:configname, db:dbname});

    it.skip("test invalid mac", function(done) {
        quotaMgr.checkQuota('FF:FF:FF:FF:FF:FF', function(err, result) {
            assert(result.status == QuotaMgr.STATUS_CODE.NOTALLOW);
            done();
        });
    });

    it.skip("test day", function(done) {
        quotaMgr.checkQuota('c0:9f:42:7a:4b:14', function(err, result) {
            assert(result.status == QuotaMgr.STATUS_CODE.OK);
            done();
        });
    });

    it.skip("test day 2", function(done) {
        var date = Date.today();
        quotaMgr.checkQuota('c0:9f:42:7a:4b:14', date, function(err, result) {
            if (result.status == QuotaMgr.STATUS_CODE.OK) {
                quotaMgr.setQuota('c0:9f:42:7a:4b:14', date, function(err, result) {
                    quotaMgr.checkQuota('c0:9f:42:7a:4b:14', date, function(err, result) {
                        assert(result.status == QuotaMgr.STATUS_CODE.USED);
                        done();
                    });
                });
            }
            else {
                console.log(date + ' is set.');
            }
        });
    });

    it.skip("test day 3", function(done) {
        var date = Date.tomorrow();
        quotaMgr.checkQuota('c0:9f:42:7a:4b:14', date, function(err, result) {
            if (result.status == QuotaMgr.STATUS_CODE.OK) {
                quotaMgr.setQuota('c0:9f:42:7a:4b:14', date, function(err, result) {
                    done();
                });
            }
            else {
                console.log(date + ' is set.');
                done();
            }
        });
    });

});
