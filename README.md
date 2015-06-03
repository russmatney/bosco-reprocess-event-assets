# reprocess-event-assets

Process raw event assets - scales and converts to .mp4, optionally overwrites existing scaled images

Invokes Lambda functions: `gif-to-mp4` and `scale-asset` for relevant .gifs/.jpgs

This AWS Lambda function:

- Requires `srcBucket` and `prefix` as params
- Builds a list of the 'raw' (unprocessed) gifs or jpgs in the bucket
- Checks for a sibling .mp4, _180.gif, _400.gif file
- Invokes `gif-to-mp4` for .gif files if no .mp4 exists OR if `forceReconvert` is set to true
- Invokes `scale-asset` for .gif or .jpg files if no _180/_400 exists OR if `forceRescale` is set to true

##Overview

The intended invokation of this function is the AWS console,
which allows you to set the `srcBucket` and `prefix` before invoking.

```js
//example input
var event = {
  "srcBucket": "russbosco",
  "prefix": "events/partytownusa",
  "forceReconvert": false, //optional
  "forceRescale": false //optional
};
```
