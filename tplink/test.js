/**
 * Created by Derek on 2014/10/6.
 */


var cheerio = require('cheerio');
var request = require('request');
var iconv = require('iconv-lite');
var _ = require('underscore');
var Q = require('q');
var async = require('async');
var querystring = require('querystring');

var HttpRequest = function(user, password) {

    this.user = user;
    this.password = password;

    this.callUrl = function(url, referer, cb) {
        request(
            {
                url: url,
                method: 'GET',
                timeout: 10000,
                auth: {
                    'user': this.user,
                    'pass': this.password
                },
                headers: {
                    'Referer' : referer
                }
            },
            function(error, response, html) {
                if (error != null) {
                    cb(error, null);
                }
                else if (response.statusCode < 200 || response.statusCode > 299) {
                    cb('Response code=' + response.statusCode, null);
                }
                else {
                    cb(null, html);
                }
            });
    };
};

/*
    Get Mac Filter Status

    url = http://192.168.0.1/userRpm/WlanMacFilterRpm.htm (2.4G)
          http://192.168.0.1/userRpm/WlanMacFilterRpm.htm?Page=2
          http://192.168.0.1/userRpm/WlanMacFilterRpm_5g.htm

    referer = http://192.168.0.1/userRpm/MenuRpm.htm

 */

var WifiCmd = function(config) {
    var self = this;

    config = config || {};
    self.server = config.server || 'http://192.168.0.1';
    self.user = config.user || 'admin';
    self.password = config.password || '1qaz2wsx';

    var PAGE_SIZE = 8;

    self.httpService = new HttpRequest(self.user, self.password);

    function macWithdash(mac) {
        return mac.replace(/:/g, '-');
    }

    function macWithColon(mac) {
        return mac.replace(/-/g, ':');
    }

    function removeDoubleQuotes(str) {
        return str.replace(/\"/g, '');
    }

    /*
     Repeatedly call url with different page index

     cb(err, result), where result is array of items (reported by the parser)

     */
    self.callPages = function(url, referer, parserFn, cb) {
        // repeatedly calling url?Page=n, break until page return less than 8 objects
        //
        var pageIndex = 1;
        var resultAll = [];
        async.doWhilst(
            function(callback) {
                self.httpService.callUrl(url + '?Page=' + pageIndex, referer, function(err, html) {
                    if (err != null) {
                        callback(err);
                    }
                    else {
                        var result = parserFn(html);
                        resultAll = resultAll.concat(result);
                        if (result.length == PAGE_SIZE)
                            pageIndex = pageIndex + 1;
                        else
                            pageIndex = 0;
                        callback(null);
                    }
                });
            },

            function() {
                return pageIndex > 0;
            },

            function(err) {
                if (err != null)
                    cb(err);
                else
                    cb(null, resultAll);
            }
        );
    };

    self.parseMacFilter = function(html) {
        // 用regular expression來抓
        //
        var regExp = /var wlanFilterList = new Array\(([\s\S]*)\n0,0 \);/m;
        var result = regExp.exec(html);

        /*
         result[1] =
            "C4-43-8F-F5-CC-E8", 1, 1, "", "Derek Nexus5",
            "E4-CE-8F-32-AB-28", 1, 1, "", "Derek MBP",
            "AC-CF-5C-AB-B9-FB", 1, 1, "", "Derek iPadAir",
            "C0-9F-42-7A-4B-14", 0, 1, "", "為為 iPhone4",
            "4C-8D-79-65-37-97", 0, 1, "", "為為 iPhone5",
            "A4-67-06-65-11-6F", 0, 1, "", "為為 iPad2",
            "74-2F-68-25-78-17", 0, 1, "", "芸芸 小米",
            "30-85-A9-DC-20-63", 1, 1, "", "Elan Nexus7",
         */

        var macList = [];
        var lines = result[1].split('\n');
        _.each(lines, function(line) {
            if (line) {
                line = line.trim();
                var tokens = line.split(',');
                if (tokens && tokens.length > 2) {
                    macList.push({mac: removeDoubleQuotes(tokens[0].trim()), enable: tokens[1].trim() == "1", name: removeDoubleQuotes(tokens[4]).trim()});
                }
            }
        });

        return macList;
    };

    /*
        Return mac filter setting
     */
    self.getMacFilterList = function(cb) {
        var url = self.server + '/userRpm/WlanMacFilterRpm.htm';
        var referer = self.server + '/userRpm/MenuRpm.htm';

        // TODO: 5G url = /userRpm/WlanMacFilterRpm_5g.htm'

        self.callPages(url, referer,
            function(html) {
                return self.parseMacFilter(html)
            },
            cb);
    };

    /*
        Enable/Disable Mac Filter

        http://192.168.0.1/userRpm/WlanMacFilterRpm.htm?Modify=2&Page=1
        - Modify是0-based index (含所有頁面)

        - call
            http://192.168.0.1/userRpm/WlanMacFilterRpm.htm?
            Mac=AC-CF-5C-AB-B9-FB&
            Desc=Derek+iPadAir&
            Type=1&
            entryEnabled=0&
            Changed=1&
            SelIndex=2&
            Page=1&
            Save=%E5%84%B2%E5%AD%98

        entryEnabled = 1(enable) 0(disable)

        Referer = http://192.168.0.1/userRpm/WlanMacFilterRpm.htm?Modify=2&Page=1
     */

    self.enableMac = function(mac, enable, cb) {
        // TODO: 目前只處理2.4G
        //
        self.getMacFilterList(function(err, macList) {
            if (err) {
                cb(err);
            }
            else {
                // look for mac index
                //
                var item = findMac(macList, mac);
                if (item == null) {
                    cb('Cannot find mac:' + mac);
                }
                else if (item.enable == enable) {
                    cb(null, enable);
                }
                else {
                    self.doEnableMac(item.index, item.mac, item.name, enable, cb);
                }
            }
        });
    };

    self.doEnableMac = function(index, mac, name, enable, cb) {
        var pageIndex = Math.floor(index / PAGE_SIZE) + 1;
        var params = {
            Mac : mac,
            Desc: name,
            Type: 1,
            entryEnabled : enable ? 1 : 0,
            Changed : 1,
            SelIndex : index,
            Page : pageIndex,
            Save : "儲存"
        };
        var url = self.server + '/userRpm/WlanMacFilterRpm.htm?' + querystring.stringify(params);
        var referer = self.server + '/userRpm/WlanMacFilterRpm.htm?Modify=' + index + '&Page=' + pageIndex;
        self.httpService.callUrl(url, referer, function(err, html) {
            console.log(html);
            if (err != null) {
                cb(err);
            }
            else {
                cb(null, enable);
            }
        });
    };

    function findMac(macList, mac) {
        var i = 0;
        for (i = 0; i < macList.length; i++) {
            var macItem = macList[i];
            if (macItem.mac.toLowerCase() == mac.toLowerCase())
                return {mac: mac, name: macItem.name, enable: macItem.enable, index: i};
        }
        return null;
    }

    /*
        Get Mac Connection Status

        http://192.168.0.1/userRpm/WlanStationRpm_5g.htm?Page=1
     */

    self.parseMacConnection = function(html) {
        // 用regular expression來抓
        //
        var regExp = /var hostList = new Array\(([\s\S]*)\n0,0 \);/m;
        var result = regExp.exec(html);

        /*
         result[1] =
            "E4-CE-8F-32-AB-28", 5, 105773, 117671,
         */

        var connList = [];
        var lines = result[1].split('\n');
        _.each(lines, function(line) {
            if (line) {
                line = line.trim();
                var tokens = line.split(',');
                if (tokens.length > 0) {
                    connList.push({mac: removeDoubleQuotes(tokens[0].trim()), duration:tokens[2].trim()});
                }
            }
        });

        return connList;
    };

    /*
        Return mac connection list
     */
    self.getMacConnectionList = function(cb) {
        // http://192.168.0.1/userRpm/WlanStationRpm_5g.htm
        var url = self.server + '/userRpm/WlanStationRpm.htm';
        var referer = self.server + '/userRpm/WlanStationRpm.htm';

        // TODO: 5G url = /userRpm/WlanStationRpm_5g.htm'

        self.callPages(url, referer,
            function(html) {
                return self.parseMacConnection(html)
            },
            cb);
    };

};

var wifiCmd = new WifiCmd({server: 'http://192.168.0.1', user:'admin', password:'1qaz2wsx'});

/*
wifiCmd.getMacFilterList(function(err, result) {
 console.log(err || result);
});
*/

wifiCmd.getMacConnectionList(function(err, result) {
    console.log(err || result);
});

/*
wifiCmd.enableMac('00-22-69-B5-D9-53', true, function(err, result) {
    console.log(err || result);
});
*/



