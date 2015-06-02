# reprocess-event-assets

Process raw event assets - scales and converts to .mp4, optionally overwrites existing scaled images

Invokes Lambda functions: `gif-to-mp4` and `scale-asset` for relevant .gifs/.jpgs

This AWS Lambda function:

- Requires `srcBucket` and `prefix` as params
- Filters files to be scaled or converted to .mp4s by suffix and extension
- If a scaled or converted file already exists, it will not be re-scaled or re-converted unless the `force_scale` or `force_conversion` param is passed as true
- Invokes `gif-to-mp4` for .gif files - builds destination keys
- Invokes `scale-asset` for .gif or .jpg files - builds destination keys, sets the res at 180 and 400.

##Overview

The intended invokation of this function is the AWS console,
which allows you to set the `srcBucket` and `prefix` before invoking.

