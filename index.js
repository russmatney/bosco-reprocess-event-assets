var path = require('path');
var Q = require('q');
var AWS = require('aws-sdk');
var Lambda = new AWS.Lambda();
var S3 = new AWS.S3();

var validate = require('lambduh-validate');

var invokeScaleAsset = function(event, res) {
  var defer = Q.defer();

  var destKey = path.dirname(event.srcKey) + '/' + path.basename(event.srcKey, event.extension) + '_' + res + event.extension;
  console.log(destKey);
  Lambda.invokeAsync({
    FunctionName: "scale-asset",
    InvokeArgs: JSON.stringify({
      srcUrl: event.srcUrl,
      destBucket: event.srcBucket,
      destKey: destKey,
      newRes: res
    })
  }, function(err) {
    if (err) {
      defer.reject(err);
    } else {
      console.log('scale-asset invoked with res: ' + res);
      defer.resolve(event);
    }
  });
  return defer.promise;
};

var invokeGifToMp4 = function(options) {
  var defer = Q.defer();

  var destKey = path.dirname(options.srcKey) + "/" + path.basename(options.srcKey, path.extname(options)) + '.mp4';
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
        console.log('allkeys');
        console.log(allKeys);

        rawKeys = allKeys.map(function(key) {
          if (endsWith(key, '\\.(gif|jpg|GIF|JPG)') && !endsWith(key, '_\\d+\\.(gif|jpg|GIF|JPG)'))
            return key;
        });
        rawKeys = rawKeys.filter(function(v) { return v; });
        console.log('rawKeys');
        console.log(rawKeys);

        mp4Keys = keysToBasenames(allKeys, {
          endsWith: '\\.mp4'
        });
        console.log('mp4Keys');
        console.log(mp4Keys);

        var keys180 = keysToBasenames(allKeys, {
          endsWith: '_180\\.(gif|jpg)',
          suffix: '_180'
        });
        console.log('keys180');
        console.log(keys180);

        var keys400 = keysToBasenames(allKeys, {
          endsWith: '_400\\.(gif|jpg)',
          suffix: '_400'
        });
        console.log('keys400');
        console.log(keys400);

        def.resolve();
      }
    });
    return def.promise;
  })

  .then(function() {
    var def = Q.defer();

    var gifsToConvert = rawKeys.filter(function(key) {
      if (!contains(mp4Keys, stripToBase(key)) || event.forceConvert) {
        return key;
      } else {
        return false;
      }
    });
    console.log('gifsToConvert');
    console.log(gifsToConvert);
    //invoke GifToMp4 for all gifsToConvert
    gifsToConvert.forEach(function(key) {
      if (path.extname(key) == '.gif' || path.extname(key) == '.GIF') {
        def.resolve(invokeGifToMp4({
          srcKey: key,
          srcBucket: event.srcBucket
        }));
      } else {
        def.resolve(event);
      }
    });

    return def.promise;
  })

  .then(function() {
    //filter array to filesToScale
    //invoke ScaleAsset for all filesToScale
  })


  .then(function() {
    //return invokeScaleAsset(event, "180");
  })
  .then(function() {
    //return invokeScaleAsset(event, "400");
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
