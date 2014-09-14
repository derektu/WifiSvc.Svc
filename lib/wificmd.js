
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
        var url = 'http://' + this.server + "/ulwlalist.cmd";

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
    //	result is an array of {'mac':..}
    //
    this.getMacFilterList = function(callback) {
        var url = 'http://' + this.server + "/wlmacflt.cmd?action=ul";

        requestParser.call(url, this.user, this.password,
            function(html) {
                var $ = cheerio.load(html);

                // find the <table> with <td class="TableTilte">
                //
                var result = [];
                var td = $('td.TableTilte').first();
                var table = td.parent();
                while (table != null &&  table.length > 0 && table[0].name != 'table') {
                    table = table.parent();
                }

                if (table == null || table.length == 0) {
                    callback(null, result);
                    return;
                }

                table.children('tr').each(function(index, tr) {
                    var tds = this.children('td');
                    if (tds.length == 3) {
                        var mac = $(tds[1]).text().trim();
                        result.push({'mac': mac});
                    }
                });

                callback(null, result);
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
        var url = 'http://' + this.server + "/wlmacflt.cmd?action=ul";

        /*
         jsdom.defaultDocumentFeatures = {
         FetchExternalResources   : ['script'],
         ProcessExternalResources : ['script'],
         MutationEvents           : '2.0',
         QuerySelector            : false
         };
         */

        requestParser.call(url, this.user, this.password,
            function(html) {
                /*
                 // jsdom: will not run under node.js web server
                 //
                 // Wait until document is loaded, and then lookup global var 'mode'
                 //	if mode is 'disabled', then Mac Filter mode is off.
                 //
                 var doc = jsdom.jsdom(html);
                 var window = doc.createWindow();
                 doc.onload = function() {
                 if (window.mode == 'disabled')
                    onSuccess(false);
                 else
                    onSuccess(true);
                 }
                 */
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
        var url = 'http://' + this.server + "/wlmacflt.cmd?action=ulsave&wlFltMacMode=" + (enable ? 'allow' : 'disabled');
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
        var url = 'http://' + this.server + "/wlmacflt.cmd?action=uladd&newmac=" + mac.toUpperCase() + '&wlFltMacMode=allow';

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
        var url = 'http://' + this.server + "/wlmacflt.cmd?action=ulremove&rmLst=" + mac.toUpperCase();

        requestParser.call(url, this.user, this.password,
            function(html) {
                callback(null, true);
            },
            function(error) {
                callback(error, null);
            }
        );
    };
};

module.exports = WifiCmd;






