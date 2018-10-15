// ============================================================================
// Libraries:

const Alexa = require('alexa-app');
const SSMLBuilder = require('ssml-builder');

// ============================================================================
// Constants:

const WHERE_THE_WILD_THINGS_ARE = [
  'https://s3.amazonaws.com/alexa-storyteller/stories/1/0.mp3',
  'https://s3.amazonaws.com/alexa-storyteller/stories/1/0.mp3',
];

const STORIES = {
  "1": WHERE_THE_WILD_THINGS_ARE,
};

const STORY_IDS = Object.keys(STORIES);

// ============================================================================
// Initialization:

/** @type {Alexa.app} - JSDoc type annotation for VSCode autocomplete */
const alexaApp = new Alexa.app('storyteller');

// ============================================================================
// Intent handlers:

// ================
// Built in:

// Amazon built-in intents do not require custom slot/utterence schemas:
// - Schema don't actually do anything unless using ASK CLI.
const DEFAULT_SCHEMA = {
  slots: {},
  utterances: [],
};

/** Session initialization. */
alexaApp.launch((request, response) => {
  console.log('launched');
  response
    .say('What story would you like me to tell?')
    .shouldEndSession(false);
});

/** Continue the story on any further interaction. */
alexaApp.intent('AMAZON.FallbackIntent',
  (request, response) => {
    console.log('fallback');
    readStory(request, response);
  }
);

// ================
// Custom:

alexaApp.intent('BeginStoryIntent',
  (request, response) => {
    const slot = request.slots['Story'];
    const value = request.slot('Story');
    
    let story = slot.resolution().first().id;

    // Random story:
    if (story < 0) {
      story = STORY_IDS[Math.floor(Math.random() * STORY_IDS.length)];
    }

    console.log(`Beginning story: ${story}`);

    // Initialize the current story session:
    const session = request.getSession();
    session.set('story', story);
    session.set('index', 0);

    response.say(`All right, I'll read ${value}.`);

    readStory(request, response);
  }
);

alexaApp.intent('ContinueStoryIntent',
  (request, response) => {
    readStory(request, response);
  }
);

// ============================================================================
// Helper functions:

/**
 * @param {Alexa.request} request 
 * @param {Alexa.response} response
*/
function readStory(request, response) {
  const session = request.getSession();
  const story = session.get('story');
  const index = session.get('index');

  const builder = new SSMLBuilder();

  // Light error checking:
  const script = STORIES[story];
  if (!script) {
    response.say(`I can't read ${story}.`);
    return;
  }

  if (index >= script.length) {
    response.say('The end.');
    return;
  }

  // Construct audio SSML for Alexa:
  builder.audio(script[index]);

  response.say(builder.ssml(true)).shouldEndSession(false);

  // Update the session:
  session.set('index', index + 1);
}

// ============================================================================

exports.handler = alexaApp.lambda();
