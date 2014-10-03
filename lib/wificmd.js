
var requestParser = require('./requestParser.js');
var cheerio = require('cheerio');

var WifiCmd = function(config) {

    var self = this;

    this.server = config.server;
    this.user = config.user;
    this.password = config.password;

    // callback(err, result)
    //	result is an array of {'mac':.., 'duration':}
    //
    this.getConnectionList = function(callback) {
        var url = this.server + "/ulwlalist.cmd";

        requestParser.call(url, this.user, this.password,
            function(html) {
                var $ = cheerio.load(html);

                // <div class='NaviText'>
                // 	<table>
                //	  <table>
                //
                var table = $('div.NaviText table table').first();

                var result = [];

                table.children('tr').each(function(index, tr) {
                    if (index != 0) {
                        var tds = this.children('td');
                        var mac = $(tds[1]).text().trim();
                        var duration = $(tds[2]).text().trim();
                        result.push({"mac": mac, "duration":duration});
                    }
                });
                callback(null, result);
            },
            function(error) {
                callback(error, null);
            }
        );
    };

    // callback(err, result)
    //	err is {'error':.., 'statusCode':..}
    //	result is { filterMode:1, macList:[mac, mac}] }
    //
    this.getMacFilterList = function(callback) {
        var url = this.server + "/wlmacflt.cmd?action=ul";

        requestParser.call(url, this.user, this.password,
            function(html) {
                var $ = cheerio.load(html);

                var maclist = [];

                // find the <table> with <td class="TableTilte">
                //
                var td = $('td.TableTilte').first();
                var table = td.parent();
                while (table != null &&  table.length > 0 && table[0].name != 'table') {
                    table = table.parent();
                }

                if (table != null) {
                    table.children('tr').each(function (index, tr) {
                        var tds = this.children('td');
                        if (tds.length == 3) {
                            var mac = $(tds[1]).text().trim();
                            maclist.push(mac);
                        }
                    });
                }

                // look for filtermode
                //
                var regExp = /var mode=\'(.*)\';/;
                var result = regExp.exec(html);
                var filterMode = 0;
                if (result != null)
                    filterMode = (result[1] == 'disabled') ? 0 : 1;

                callback(null, {filterMode: filterMode, macList: maclist});
            },
            function(error) {
                callback(error, null);
            }
        );
    };

    // callback(err, result):
    //	result is true (if enabled) or false (if disabled)
    //
    this.getMacFilterMode = function(callback) {
        var url = this.server + "/wlmacflt.cmd?action=ul";

        requestParser.call(url, this.user, this.password,
            function(html) {
                var regExp = /var mode=\'(.*)\';/;
                var result = regExp.exec(html);
                if (result != null) {
                    if (result[1] == 'disabled')
                        callback(null, false);
                    else
                        callback(null, true);
                }
                else {
                    callback({'error':'cannot parse html'}, null);
                }
            },
            function(error) {
                callback(error, null);
            }
        );
    };

    // callback(err, result):
    //  result = true
    //
    this.setMacFilterMode = function(enable, callback) {
        var url = this.server + "/wlmacflt.cmd?action=ulsave&wlFltMacMode=" + (enable ? 'allow' : 'disabled');
        requestParser.call(url, this.user, this.password,
            function(html) {
                callback(null, true);
            },
            function(error) {
                callback(error, null);
            }
        );
    }

    // callback(err, result):
    //  result = true
    //
    this.addMac = function(mac, callback) {
        var url = this.server + "/wlmacflt.cmd?action=uladd&newmac=" + mac.toUpperCase() + '&wlFltMacMode=allow';

        requestParser.call(url, this.user, this.password,
            function(html) {
                callback(null, true);
            },
            function(error) {
                callback(error, null);
            }
        );
    };

    // callback(err, result):
    //  result = true
    //
    this.removeMac = function(mac, callback) {
        var url = this.server + "/wlmacflt.cmd?action=ulremove&rmLst=" + mac.toUpperCase();

        requestParser.call(url, this.user, this.password,
            function(html) {
                callback(null, true);
            },
            function(error) {
                callback(error, null);
            }
        );
    };

    // callback(err, result):
    //  result =

    //
    /*
        callback(err, result)

        result = { code:.., msg:.. }

        code = 0: OK, 開始啟動
        code = 1: 今日不能使用
        code = 2: 今日已經使用, 不能再用
        code = 3: 其他錯誤原因..
     */

    this.quotaMac = function(mac, callback) {



    };


};

module.exports = WifiCmd;






