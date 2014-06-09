// var Q = require('q'),
//     request = require('request'),
//     format = require('util').format,
//     _ = require('lodash');

function Request(options) {
    this.wsapiUrl = options.server + '/slm/webservice/' + options.apiVersion;
    // this.httpRequest = request.defaults(options.requestOptions);
    this.httpRequest = angular.injector(['ng']).get('$http');
    // Q = injector.get('$q');
    this._hasKey = options.requestOptions &&
        options.requestOptions.headers &&
        options.requestOptions.headers.zsessionid;
    this._hasAuth = options.requestOptions &&
        options.requestOptions.auth &&
        options.requestOptions.auth.user;
    if (this._hasAuth) {
        var user = options.requestOptions.auth.user,
            pass = options.requestOptions.auth.pass,
            header = typeof pass !== 'undefined' ? user + ':' + pass : user;
        this.httpRequest.defaults.headers.common.Authorization = 'Basic ' + window.btoa(header);
    }
}

Request.prototype.doSecuredRequest = function(method, options) {
    if(this._hasKey) {
        return this.doRequest(method, options);
    }

    var self = this,
        deferred = Q.defer();

    function doRequest() {
        self.doRequest(method, _.merge(options, {
            qs: {
                key: self._token
            }
        }), function(error, result) {
            if(error) {
                deferred.reject(error);
            } else {
                deferred.resolve(result);
            }
        });
    }

    if (this._token) {
        doRequest();
    } else {
        this.doRequest('get', {
            url: '/security/authorize'
        }).then(function(result) {
                self._token = result.SecurityToken;
                doRequest();
            },
            function(error) {
                deferred.reject(error);
            });
    }

    return deferred.promise;
};

Request.prototype.doRequest = function(method, options) {
    var self = this,
        deferred = Q.defer();

    this.httpRequest(_.extend({}, options, {
        method: method,
        url: this.wsapiUrl + options.url
    // }), function(err, response, body) {
    //     if (err) {
    //         deferred.reject([err]);
    //     } else if (!response) {
    //         deferred.reject(['Unable to connect to server: ' + self.wsapiUrl]);
    //     } else if (!body || !_.isObject(body)) {
    //         deferred.reject([options.url + ': ' + response.statusCode + '! body=' + body]);
    //     } else {
    //         var result = _.values(body)[0];
    //         if (result.Errors.length) {
    //             deferred.reject(result.Errors);
    //         } else {
    //             deferred.resolve(result);
    //         }
    //     }
    })).success(function(data, status, headers, config) {
        var result = _.values(data)[0];
        if (result.Errors.length) {
            deferred.reject(result.Errors);
        } else {
            deferred.resolve(result);
        }
    }).error(function(data, status, headers, config) {
        if (!status) {
            deferred.reject(['Unable to connect to server: ' + self.wsapiUrl]);
        } else if (!data) {
            deferred.reject([options.url + ': ' + status + '! body=' + data]);
        }
    });

    return deferred.promise;
};

Request.prototype.get = function(options) {
    return this.doRequest('get', options);
};

Request.prototype.post = function(options) {
    return this.doSecuredRequest('post', options);
};

Request.prototype.put = function(options) {
    return this.doSecuredRequest('put', options);
};

Request.prototype.del = function(options) {
    return this.doSecuredRequest('del', options);
};

// module.exports = {
//     init: function(options) {
//         return new Request(options);
//     },
//     Request: Request
// };