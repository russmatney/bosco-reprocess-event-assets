module.exports = {
  FunctionName: 'process-event-assets',
  Description: 'Process raw event assets - scales and converts to .mp4, optionally overwrites existing scaled images',
  Handler: 'index.handler',
  Role: 'arn:aws:iam::106586740595:role/executionrole',
  Region: 'us-east-1',
  Runtime: 'nodejs',
  MemorySize: 320,
  Timeout: 60
};
