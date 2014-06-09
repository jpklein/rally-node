angular.module('rally.service', [])
.factory('request', ['$q', '$http', function($q, $http) {
  var request = {

    doSecuredRequest: function(method, options, callback) {
      if (this._hasKey) {
        return this.doRequest(method, options, callback);
      }

      var self = this,
          deferred = $q.defer();

      function doRequest() {
        self.doRequest(method, _.merge(options, {
          qs: {
            key: self._token
          }
        }), function(error, result) {
          if (error) {
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
        }, function(error) {
          deferred.reject(error);
        });
      }

      return deferred.promise.nodeify(callback);
    },

    doRequest: function(method, options, callback) {
      var self = this,
          deferred = $q.defer();

    // this.httpRequest[method](_.extend({}, options, {
    //     url: this.wsapiUrl + options.url
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
    // });

      $http(_.extend({}, options, {
        method: method, 
        url: this.wsapiUrl + options.url
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

      return deferred.promise.nodeify(callback);
    },

    get: function(options, callback) {
      return this.doRequest('get', options, callback);
    },

    post: function(options, callback) {
      return this.doSecuredRequest('post', options, callback);
    },

    put: function(options, callback) {
      return this.doSecuredRequest('put', options, callback);
    },

    del: function(options, callback) {
      return this.doSecuredRequest('del', options, callback);
    }
  };

  return function (options) {
    request.wsapiUrl = options.server + '/slm/webservice/' + options.apiVersion;
    // request.httpRequest = request.defaults(options.requestOptions);
    request._hasKey = options.requestOptions &&
        options.requestOptions.headers &&
        options.requestOptions.headers.zsessionid;

    return request;
  }
}]);
