const { WebSocketServer } = require('ws');
const {createServer} = require('http');
const {createEndpoint} = require('@jambonz/node-client-ws');
const server = createServer();
const logger = require('pino')({level: process.env.LOGLEVEL || 'info'});
const port = process.env.WS_PORT || 3000;
const wssStream = new WebSocketServer({ noServer: true });
const handleStream = require('./lib/utils/ws-stream');
const makeService = createEndpoint({
  server,
  externalWss: [
    {
      path: '/streaming-with-llm',
      wss: wssStream
    }
  ]});

require('./lib/routes')({logger, makeService});

server.listen(port, () => {
  logger.info(`jambonz websocket server listening at http://localhost:${port}`);
});

// handle connections from jambonz listen socket
wssStream.on('connection', (ws) => {
  handleStream(logger, ws);
});
