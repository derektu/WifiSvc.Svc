// Calling Wifi service, and return the result as a parsed DOM
//

var _request = require('request');
var _iconv = require('iconv-lite');


exports.call = function(url, user, password, onSuccess, onFail) {
	_request({
		'url': url,
		'method': 'GET',
		'timeout': 10000,
		'encoding': null,
		'auth': {
			'user': user,
			'pass': password
			}
		}, 
		function(error, response, html) {
			if (!error && response.statusCode == 200) {
				var htmlBig5 = _iconv.decode(new Buffer(html), "big5");			
				onSuccess(htmlBig5);
			}
			else {
				onFail({
					'error': error,
					'statusCode': response != null ? response.statusCode : 0
				});	
			}		
		});
}



