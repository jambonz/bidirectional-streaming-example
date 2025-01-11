const service = ({logger, makeService}) => {
  const svc = makeService({path: '/streaming-test'});

  svc.on('session:new', (session) => {
    session.locals = {logger: logger.child({call_sid: session.call_sid})};
    logger.info({session}, `new incoming call: ${session.call_sid}`);

    try {
      session
        .on('close', onClose.bind(null, session))
        .on('error', onError.bind(null, session));

      session
        .say({text: 'Hi there, you are speaking to Claude.  How can I help you today?'})
        .listen({
          url: 'wss://jambonz-apps.drachtio.org/streaming-with-llm',  //replace with your wss url
          sampleRate: 8000,
          bidirectionalAudio: {
            enabled: true,
            streaming: true,
            sampleRate: 16000
          }
        })
        .send();
    } catch (err) {
      session.locals.logger.info({err}, `Error to responding to incoming call: ${session.call_sid}`);
      session.close();
    }
  });
};

const onClose = (session, code, reason) => {
  const {logger} = session.locals;
  logger.info({session, code, reason}, `session ${session.call_sid} closed`);
};

const onError = (session, err) => {
  const {logger} = session.locals;
  logger.info({err}, `session ${session.call_sid} received error`);
};

module.exports = service;
