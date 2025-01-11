
const systemPrompt = `You are a helpful conversational AI voice bot.
Please keep your answers short and to the point; the user will follow up with more questions if needed.
Please reply with unadorned text that can be read aloud to the user using a TTS engine`;
const Anthropic = require('@anthropic-ai/sdk');
const ANTHROPIC_MODEL = 'claude-3-5-haiku-latest';
const client = new Anthropic({ system: systemPrompt });

const textToSpeech = require('@google-cloud/text-to-speech');
const textToSpeechClient = new textToSpeech.TextToSpeechClient();
const { SpeechClient } = require('@google-cloud/speech');
const speechClient = new SpeechClient();
const requestConfig = {
  encoding: 'LINEAR16',
  sampleRateHertz: 8000,
  languageCode: 'en-US',
};
const streamingRequest = { config: requestConfig, interimResults: false };

const handleStream = (logger, ws) => {
  logger.info('New client connected');

  // Streaming recognition setup
  let recognizeStream;

  ws.on('message', async(message, isBinary) => {
    if (isBinary) {
      // Handle binary frames (audio)
      if (!recognizeStream) {
        logger.info('Starting Google Speech-to-Text stream...');
        recognizeStream = speechClient
          .streamingRecognize(streamingRequest)
          .on('error', (err) => logger.error({ err }, 'Speech-to-Text error'))
          .on('data', async(data) => {
            if (data.results[0] && data.results[0].alternatives[0]) {
              const transcript = data.results[0].alternatives[0].transcript;
              logger.info({ transcript }, 'Transcription received');

              const msg = await client.messages.create({
                model: ANTHROPIC_MODEL,
                max_tokens: 1024,
                messages: [{ role: 'user', content: transcript }]
              });

              if (msg.type === 'message' && msg.content[0].type === 'text' && msg.content[0].text.length > 0) {
                logger.info(`Claude says: ${msg.content[0].text}`);

                try {
                  const request = {
                    input: { text: msg.content[0].text },
                    voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
                    audioConfig: {
                      audioEncoding: 'LINEAR16', // Raw PCM data
                      sampleRateHertz: 16000, // 16kHz sample rate
                    },
                  };
                  const [response] = await textToSpeechClient.synthesizeSpeech(request);
                  if (response.audioContent && response.audioContent.length > 0) {
                    // drop wav header
                    const rawAudio = response.audioContent.slice(44);
                    ws.send(rawAudio, { binary: true }, (err) => {
                      if (err) {
                        logger.error({err}, 'Error sending audio data over WebSocket');
                      }
                    });
                  }
                } catch (err) {
                  logger.error({ err }, 'Error generating TTS audio');
                }
              }
            }

          });
      }
      // Write binary audio data to the Speech-to-Text stream
      recognizeStream.write(message);
    } else {
      // Handle text frames (JSON)
      try {
        const json = JSON.parse(message.toString());
        logger.info({ json }, 'Received JSON');
      } catch (err) {
        logger.error({ err, message: message.toString() }, 'Invalid JSON received');
        ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      }
    }
  });

  ws.on('close', () => {
    logger.info('Client disconnected');
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
  });

  ws.on('error', (err) => {
    logger.error({ err }, 'WebSocket error');
  });
};

module.exports = handleStream;
