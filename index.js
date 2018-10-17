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
  '1': WHERE_THE_WILD_THINGS_ARE,
};

const STORY_IDS = Object.keys(STORIES);

const REPLACE_ALL = 'REPLACE_ALL';
const ENQUEUE = 'ENQUEUE';

// ============================================================================
// Initialization:

/** @type {Alexa.app} - JSDoc type annotation for VSCode autocomplete */
const alexaApp = new Alexa.app('storyteller');

// ============================================================================
// Intents:

/** Session initialization. */
alexaApp.launch(askForStoryHandler);

// Audio Player required intents:
alexaApp.intent('AMAZON.PauseIntent', pauseHandler);
// TODO - Use database to handle resumption:
alexaApp.intent('AMAZON.ResumeIntent', askForStoryHandler);
alexaApp.intent('AMAZON.CancelIntent', cancelHandler);
alexaApp.intent('AMAZON.LoopOffIntent', unsupportedHandler);
alexaApp.intent('AMAZON.LoopOnIntent', unsupportedHandler);
alexaApp.intent('AMAZON.NextIntent', continueStoryHandler);
alexaApp.intent('AMAZON.PreviousIntent', unsupportedHandler);
alexaApp.intent('AMAZON.RepeatIntent', unsupportedHandler);
alexaApp.intent('AMAZON.ShuffleOffIntent', unsupportedHandler);
alexaApp.intent('AMAZON.ShuffleOnIntent', unsupportedHandler);
alexaApp.intent('AMAZON.StartOverIntent', unsupportedHandler);

// Other built-in intents:
alexaApp.intent('AMAZON.FallbackIntent', continueStoryHandler);

// Custom intents:
alexaApp.intent('BeginStoryIntent', beginStoryHandler);
alexaApp.intent('ContinueStoryIntent', continueStoryHandler);

// ============================================================================
// Intent handlers:

/**
 * @param {Alexa.request} request 
 * @param {Alexa.response} response
*/
function askForStoryHandler(request, response) {
  console.log(request);

  response
    .say('What story would you like me to tell?')
    .shouldEndSession(false);
}

/**
 * @param {Alexa.request} request 
 * @param {Alexa.response} response
*/
function beginStoryHandler(request, response) {
  console.log(request);

  const slot = request.slots['Story'];

  let story = slot.resolution().first().id;
  let value = request.slot('Story');

  // Random story:
  if (story < 0) {
    story = STORY_IDS[Math.floor(Math.random() * STORY_IDS.length)];
    value = 'a story';
  }

  console.log(`Beginning story: ${story}`);

  // Initialize the current story session:
  const session = request.getSession();
  session.set('story', story);
  session.set('index', 0);

  response.say(`All right, I'll read ${value}.`);

  continueStoryHandler(request, response);
}

/**
 * @param {Alexa.request} request 
 * @param {Alexa.response} response
*/
function continueStoryHandler(request, response) {
  console.log(request);

  const session = request.getSession();
  const story = session.get('story');
  const index = session.get('index');

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

  // Play audio of the next part of the script:
  const stream = {
    url: script[index],
    token: encodeState({ story, index }),
    offsetInMilliseconds: 0,
  };

  response.audioPlayerPlayStream(REPLACE_ALL, stream);

  // Update the session:
  session.set('index', index + 1);
}

/**
 * @param {Alexa.request} request 
 * @param {Alexa.response} response
*/
function pauseHandler(request, response) {
  response.audioPlayerStop();
  response.say("All right, feel free to restart the story whenever you'd like.");
}

/**
 * @param {Alexa.request} request 
 * @param {Alexa.response} response
*/
function cancelHandler(request, response) {
  response.audioPlayerClearQueue();
  response.say("Got it, thanks for listening.");
}

/**
 * @param {Alexa.request} request 
 * @param {Alexa.response} response
*/
function unsupportedHandler(request, response) {
  response.say("Sorry, I can't do that yet.");
}

/**
 * @param {Alexa.request} request 
 * @param {Alexa.response} response
*/
function nullHandler(request, response) {
  console.log(request);
}

// ============================================================================
// Audio player requests:

alexaApp.audioPlayer('PlaybackStarted', nullHandler);
alexaApp.audioPlayer('PlaybackFinished', nullHandler);
alexaApp.audioPlayer('PlaybackStopped', nullHandler);
alexaApp.audioPlayer('PlaybackNearlyFinished', audioReplayHandler);
alexaApp.audioPlayer('PlaybackFailed', nullHandler);

/**
 * @param {Alexa.request} request 
 * @param {Alexa.response} response
*/
function audioReplayHandler(request, response) {
  const { story, index, token } = getStateFromAudioRequest(request);

  const stream = {
    url: STORIES[story][index],
    token,
    expectedPreviousToken: token,
    offsetInMilliseconds: 0,
  }

  response.audioPlayerPlayStream(ENQUEUE, stream);
}

/**
 * @param {Alexa.request} request
*/
function getStateFromAudioRequest(request) {
  if (!request.isAudioPlayer) {
    console.error('Expected Audio Player request.');
  }

  const { token } = request.data;
  console.log(token);

  const fields = token.split('-');
  const story = fields[0];
  const index = fields[1];

  return { story, index, token };
}

function encodeState({ story, index }) {
  return `${story}-${index}`;
}

// ============================================================================
// Helper functions:

// Credit - https://gist.github.com/jed/982883:
function uuid(a) {
  return a
    ? (a^Math.random()*16>>a/4).toString(16)
    : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, b);
}

// ============================================================================

exports.handler = alexaApp.lambda();
