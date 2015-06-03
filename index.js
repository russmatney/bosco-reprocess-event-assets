var path = require('path');
var Q = require('q');
var AWS = require('aws-sdk');
var Lambda = new AWS.Lambda({
  region: 'us-east-1'
});
var S3 = new AWS.S3();

var validate = require('lambduh-validate');

var invokeScaleAsset = function(options) {
  var defer = Q.defer();

  var destKey = path.dirname(options.srcKey) + '/' + path.basename(options.srcKey, path.extname(options.srcKey)) + '_' + options.scale + path.extname(options.srcKey);
  var srcUrl = "https://s3.amazonaws.com/" + options.srcBucket + "/" + options.srcKey;
  Lambda.invokeAsync({
    FunctionName: "scale-asset",
    InvokeArgs: JSON.stringify({
      srcUrl: srcUrl,
      destBucket: options.srcBucket,
      destKey: destKey,
      newRes: options.scale
    })
  }, function(err) {
    if (err) {
      defer.reject(err);
    } else {
      console.log('scale-asset invoked with scale: ' + options.scale);
      defer.resolve(options);
    }
  });
  return defer.promise;
};

var invokeGifToMp4 = function(options) {
  var defer = Q.defer();

  var destKey = path.dirname(options.srcKey) + "/" + path.basename(options.srcKey, path.extname(options.srcKey)) + '.mp4';
  var srcUrl = "https://s3.amazonaws.com/" + options.srcBucket + "/" + options.srcKey;
  Lambda.invokeAsync({
    FunctionName: "gif-to-mp4",
    InvokeArgs: JSON.stringify({
      srcUrl: srcUrl,
      destBucket: options.srcBucket,
      destKey: destKey
    })
  }, function(err) {
    if (err) {
      defer.reject(err);
    } else {
      console.log('gif-to-mp4 invoked');
      defer.resolve();
    }
  });

  return defer.promise;
};

var endsWith = function(str, endString) {
  return new RegExp(endString + '$').test(str);
};

var stripToBase = function(string, suffix) {
  if (!suffix) {
    suffix = '';
  }
  return path.basename(string, suffix + path.extname(string));
};

var keysToBasenames = function(keys, options) {
  return keys.map(function(key) {
    if (endsWith(key, options.endsWith))
      return key;
  })
  .filter(function(v) { return v; })
  .map(function(key) {
    return stripToBase(key, options.suffix);
  });
};

var contains = function(array, item) {
  if (array.indexOf(item) == -1) {
    return false;
  } else {
    return true;
  }
};


exports.handler = function(event, context) {
  var rawKeys = [];
  var allKeys = [];
  var mp4Keys = [];
  var keys180 = [];
  var keys400 = [];

  console.log('Validating S3 event.');
  console.log(event);
  validate(event, {
    "srcBucket": true,
    "prefix": true
  })

  .then(function() {
    var def = Q.defer();
    S3.listObjects({
      Bucket: event.srcBucket,
      Prefix: event.prefix
    }, function(err, data) {
      if (err) def.reject(err);
      else {
        allKeys = data.Contents.map(function(object) {
            return object.Key;
        });

        rawKeys = allKeys.map(function(key) {
          if (endsWith(key, '\\.(gif|jpg|GIF|JPG)') && !endsWith(key, '_\\d+\\.(gif|jpg|GIF|JPG)'))
            return key;
        });
        rawKeys = rawKeys.filter(function(v) { return v; });

        mp4Keys = keysToBasenames(allKeys, {
          endsWith: '\\.mp4'
        });

        keys180 = keysToBasenames(allKeys, {
          endsWith: '_180\\.(gif|jpg)',
          suffix: '_180'
        });

        keys400 = keysToBasenames(allKeys, {
          endsWith: '_400\\.(gif|jpg)',
          suffix: '_400'
        });

        def.resolve();
      }
    });
    return def.promise;
  })

  .then(function() {
    var def = Q.defer();

    var gifsToConvert = rawKeys.filter(function(key) {
      if (!contains(mp4Keys, stripToBase(key)) || event.forceReconvert) {
        return key;
      } else {
        return false;
      }
    });

    var promises = [];
    gifsToConvert.forEach(function(key) {
      if (path.extname(key) == '.gif' || path.extname(key) == '.GIF') {
        promises.push(invokeGifToMp4({
          srcKey: key,
          srcBucket: event.srcBucket
        }));
      }
    });

    Q.all(promises)
      .then(function() {
        console.log('mp4 convert promises resolved');
        def.resolve();
      });

    return def.promise;
  })

  .then(function() {
    var def = Q.defer();
    var file180sToConvert = rawKeys.filter(function(key) {
      if (!contains(keys180, stripToBase(key)) || event.forceRescale) {
        return key;
      } else {
        return false;
      }
    });
    var promises = [];
    file180sToConvert.forEach(function(key) {
      promises.push(invokeScaleAsset({
        srcKey: key,
        srcBucket: event.srcBucket,
        scale: "180"
      }));
    });
    Q.all(promises)
      .then(function() {
        console.log('180 scale promises resolved');
        def.resolve();
      });
    return def.promise;
  })

  .then(function() {
    var def = Q.defer();
    var file400sToConvert = rawKeys.filter(function(key) {
      if (!contains(keys400, stripToBase(key)) || event.forceRescale) {
        return key;
      } else {
        return false;
      }
    });
    var promises = [];
    file400sToConvert.forEach(function(key) {
      promises.push(invokeScaleAsset({
        srcKey: key,
        srcBucket: event.srcBucket,
        scale: "400"
      }));
    });
    Q.all(promises)
      .then(function() {
        console.log('400 scale promises resolved');
        def.resolve();
      });
    return def.promise;
  })

  .then(function() {
    context.done();
  })
  .fail(function(err) {
    if(err) {
      context.done(err);
    } else {
      context.done(new Error("Unspecifed fail."));
    }
  });
};
