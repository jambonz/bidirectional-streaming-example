# jambonz-bidirectional-streaming-exampple

This is a simple jambonz application, mainly used for testing bidirectional streaming.  For those looking to learn a bit more about jambonz, it does have some interesting features:

- receives an 8khz audio stream from jambonz, but sends a 16khz stream back; jambonz will resample as needed.
- performs STT on audio stream using google streaming recognize
- sends text transcripts to Anthropic and gets responses (also text)
- sends text responses to google TTS and then sends audio back to jambonz
- illustrates how to build a jambonz websocket application which can also accept other websocket connections in the same process

Note: this is **not** the recommended way to do LLM streaming on jambonz.  As of release 0.9.3 jambonz provides native support for an end-to-end streaming pipeline (LLM->jambonz->TTS) that has _much_ lower latency than this implementation.



