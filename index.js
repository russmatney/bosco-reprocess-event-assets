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

var invokeGifToMp4 = function(event) {
  var defer = Q.defer();

  var destKey = path.dirname(event.srcKey) + "/" + path.basename(event.srcKey, event.extension) + '.mp4';
  Lambda.invokeAsync({
    FunctionName: "gif-to-mp4",
    InvokeArgs: JSON.stringify({
      srcUrl: event.srcUrl,
      destBucket: event.srcBucket,
      destKey: destKey
    })
  }, function(err) {
    if (err) {
      defer.reject(err);
    } else {
      console.log('gif-to-mp4 invoked');
      defer.resolve(event);
    }
  });

  return defer.promise;
};

var endsWith = function(str, endString) {
  return new RegExp(endString + '$').test(str);
};

exports.handler = function(event, context) {
  var rawKeys = [];
  var allKeys = [];

  console.log('Validating S3 event.');
  console.log(event);
  validate(event, {
    "srcBucket": true,
    "prefix": true
  })

  .then(function(event) {
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

        var mp4Keys = allKeys.map(function(key) {
          if (endsWith(key, '\\.mp4')) {
            return key;
          }
        });
        mp4Keys = mp4Keys.filter(function(v) { return v; });
        console.log('mp4Keys');
        console.log(mp4Keys);

        var keys180 = allKeys.map(function(key) {
          if (endsWith(key, '_180\\.(gif|jpg)')) {
            return key;
          }
        });
        keys180 = keys180.filter(function(v) { return v; });
        console.log('keys180');
        console.log(keys180);

        var keys400 = allKeys.map(function(key) {
          if (endsWith(key, '_400\\.(gif|jpg)')) {
            return key;
          }
        });
        keys400 = keys400.filter(function(v) { return v; });
        console.log('keys400');
        console.log(keys400);

        def.resolve();
      }
    });
    return def.promise;
  })

  .then(function(event) {
    //filter array to gifsToConvert

    var allBasenames = [];
    allBasenames = allKeys.map(function(key) {
      return path.basename(key, '.mp4');
    });

    var gifsToConvert = rawKeys.filter(function(key) {
      return key;
    });
    //invoke GifToMp4 for all gifsToConvert
  })

  .then(function(event) {
    //filter array to filesToScale
    //invoke ScaleAsset for all filesToScale
  })


  //invoke gif-to-mp4
  .then(function() {
    if (event.extension == '.gif' || event.extension == '.GIF') {
      return invokeGifToMp4(event);
    } else {
      return event;
    }
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
