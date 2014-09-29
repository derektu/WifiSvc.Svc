/*
    quoteMgr.js
 */
var _ = require('underscore');
var DB = require('nedb');
require('date-utils');

function QuotaMgr(options) {
    // options.config = quota.json
    // options.db = quota.db
    //
    var self = this;

    var _opt = options || {};
    _opt.config = _opt.config || '../config/quota.json';
    _opt.db = _opt.db || '../data/quota.db';

    var _quota = require(_opt.config);

    var _db = new DB({filename:_opt.db, autoload:true});
    // set index
    _db.ensureIndex({ fieldName: 'mac', unique: true }, function (err) {
        // TODO
    });

    // every 10 minutes
    _db.persistence.setAutocompactionInterval(10 * 60 * 1000);

    /*
        執行完成後, 呼叫cb(err, result), 其中result =
        {
            status: statuscode,
            limit: n    // number of minutes allow
        }
    */
    this.checkQuota = function(mac, date, cb) {
        var macEntry = _.find(_quota, function(q) { return q.mac == mac}) || null;
        if (macEntry == null) {
            cb(null, { status: QuotaMgr.STATUS_CODE.NOTALLOW});
            return;
        }

        var day = date.getDay();
        var dayEntry = _.find(macEntry.allow, function(q) { return q.dayOfWeek == day}) || null;
        if (dayEntry == null) {
            cb(null, { status: QuotaMgr.STATUS_CODE.NOTALLOW});
            return;
        }

        /*
            - 從db內找到最後這個mac所使用的date
            - 如果date == null || date < today, 則表示可以使用 (_STATUS_NOTSET), 否則表示已經用過了 (_STATUS_USED)
         */
        checkMacQuota(mac, function(err, dbdate) {
            if (err != null) {
                cb(err, null);
            }
            else if (dbdate == null) {
                cb(null, { status: QuotaMgr.STATUS_CODE.OK, limit: dayEntry.minute});
            }
            else {
                var ymdDB = parseInt(dbdate.toFormat('YYYYMMDD'));
                var ymdDate = parseInt(date.toFormat('YYYYMMDD'));

                if (ymdDB < ymdDate) {
                    cb(null, { status: QuotaMgr.STATUS_CODE.OK, limit: dayEntry.minute});
                }
                else {
                    cb(null, { status: QuotaMgr.STATUS_CODE.USED});
                }
            }
        });
    };

    /*
        執行完成後, 呼叫cb(err, result), 其中result = date;
     */
    this.setQuota = function(mac, date, cb) {
        updateMacQuota(mac, date, cb);
    };

    /*
        update這個mac所記錄的date
     */
    function updateMacQuota(mac, date, cb) {
        _db.update({mac: mac}, { $set: {date:date} }, {multi:true, upsert:true}, function(err, numReplaced) {
            cb(err, date);
        });
    }

    /*
        cb(errs, date): 如果mac存在的話, 則return這個mac的date
     */
    function checkMacQuota(mac, cb) {
        _db.find({mac: mac}, function(errs, doc) {
            if (errs) {
                cb(errs, null);
            }
            else if (doc.length == 0) {
                cb(errs, null);
            }
            else {
                cb(null, doc[0].date);
            }
        });
    }

}

QuotaMgr.STATUS_CODE = {
    OK : 0,         // 可以使用
    NOTALLOW : 1,   // 未開放
    USED : 2        // 已經用過了
};

module.exports = QuotaMgr;

