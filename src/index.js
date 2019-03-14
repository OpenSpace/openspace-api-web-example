import openspaceApi from 'openspace-api-js';

const api = openspaceApi('localhost', 4682);
let openspace = {};

const password = '';

api.onDisconnect(() => {
  console.log('Disconnected from OpenSpace');
});

api.onConnect(async () => {
  console.log('Connected to OpenSpace');

  try {
    await api.authenticate(password);
  } catch(e) {
    console.log('Authenication failed. Error: \n', e);
    return;
  };

  try {
    openspace = await api.library();
  } catch (e) {
    console.log('OpenSpace library could not be loaded: Error: \n', e)
    return;
  }

  getTime(openspace);
  createScaleSlider();
  printScale();

  // Uncomment calls below for more examples:

  // getThreeScaleUpdates();
  // getGeoPositionForCamera();
  // setInterval(addSceneGraphNode, 2000);
});

api.connect();

// Example usages:

// Log the current simulation time, using the lua function openspace.time.UTC().
async function getTime() {
  try {
    const t = await openspace.time.UTC();
    console.log("Current simulation time: " + t[1]);
  } catch (e) {
    console.log('failed to get time. Error: \n', e);
  }
}

// Create a slider that affects Earth's scale.
function createScaleSlider() {
  const element = document.createElement('input');
  element.type = 'range';
  document.body.append(element);
  element.oninput = function (event) {
    api.setProperty('Scene.Earth.Scale.Scale', parseFloat(event.target.value));
  }
}

// Subscribe to Earth's scale and print it on the page.
async function printScale() {
  const element = document.createElement('div');
  document.body.append(element);
  const subscription = api.subscribeToProperty('Scene.Earth.Scale.Scale');
  try {
    for await (const it of subscription.iterator()) {
      element.innerHTML = "Earth scale: " + it.Value;
    }
  } catch (e) {
    console.log('Failed to get data from property. Error: \n', e);
  }
}

// Log subscription updates, and cancel subscription after getting three values.
async function getThreeScaleUpdates() {
  const subscription = api.subscribeToProperty('Scene.Earth.Scale.Scale');
  let i = 0;
  (async () => {
    try {
      console.log(subscription);
      for await (const data of subscription.iterator()) {
        console.log("Earth scale is now " + data.Value);
        if (i == 3) {
          console.log("Cancelling subscription.");
          subscription.cancel();
        }
        ++i;
      }
    } catch (e) {
      console.log('Failed to get data from property. Error: \n', e);
    }
  })();
}

// Execute a function from the lua library to get a geographic position.
async function getGeoPosition() {
  try {
    const pos = await openspace.globebrowsing.getGeoPosition("Earth", 10, 10, 10);
    console.log(pos);
  } catch (e) {
    console.log('failed to get geo position. Error: \n', e);
  }
}

// Execute a function from the lua library to get the geographic position of the camera.
async function getGeoPositionForCamera() {
  try {
    const pos = await openspace.globebrowsing.getGeoPositionForCamera();
    console.log("Camera is at: ", pos);
  } catch (e) {
    console.log('failed to get geo position for camera. Error: \n', e);
  }
}

// Add new scene graph nodes on the surface of Earth.
let nodeIndex = 0;
async function addSceneGraphNode() {
  const identifier = 'TestNode' + nodeIndex;
  const name = 'Test Node ' + nodeIndex;
  try {
    await openspace.addSceneGraphNode({
      Identifier: identifier,
      Name: name,
      Parent: 'Earth',
      Transform: {
        Translation: {
          Type:"GlobeTranslation",
          Globe: 'Earth',
          Latitude: (nodeIndex * 13) % 90,
          Longitude: (nodeIndex * 17) % 180,
          FixedAltitude: 10
        }
      },
      GUI: {
        Path: "/Other/Test",
        Name: 'TestNode'
      }
    });
  } catch (e) {
    console.log("Failed to add scene graph node. Error: \n ", e);
  }

  nodeIndex++;
  console.log('Added ' + name);

  try {
    openspace.setPropertyValue("NavigationHandler.OrbitalNavigator.Anchor", identifier);
    openspace.setPropertyValue("NavigationHandler.OrbitalNavigator.RetargetAnchor", null);
  } catch (e) {
    console.log("Failed to set anchor node. Error: \n ", e);
  }
}
