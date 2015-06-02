var path = require('path');
var Q = require('q');
var AWS = require('aws-sdk');
var Lambda = new AWS.Lambda();

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

exports.handler = function(event, context) {
  console.log('Validating S3 event.');
  console.log(event);
  validate(event, {
    "srcBucket": true,
    "prefix": true
  })

  //list filenames at prefix
  //filter files to only raw .gifs or raw .jpgs
  //filter files to only .gifs to convert to .mp4s
  //filter files to only .gifs/.jpgs to scale
  //invoke GifToMp4 for all gifsToConvert
  //invoke ScaleAsset for all filesToScale

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
