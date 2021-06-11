const app = new PIXI.Application({
  width: 640,
  height: 320,
  backgroundColor: 0xa8b5ae,
  resolution: 1,
});
document.body.appendChild(app.view);

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const gameState = {
  cheeseSpeed: 3,
  mouseSpeed: 6,
  cheeses: [],
  clouds: [],
  mice: [],
  score: 0,
  cloudSpeed: 0.75,
  unicorn: null,
  scoreText: new PIXI.Text(
    "",
    new PIXI.TextStyle({
      fill: "#ffeced",
      stroke: "#92929c",
      strokeThickness: 2,
    })
  ),
  cheeseLastSpawned: 0,
  cloudLastSpawned: 0,
  mouseLastSpawned: 0,
  hearts: [],
  groundTiles: [],
  level: 0,
};

const loadSheet = (resourceName, spritesheet, resources) => {
  const resource = resources[resourceName].data;
  const textures = Object.keys(resource.frames).map((framekey) => ({
    texture: PIXI.Texture.from(framekey),
    time: resource.frames[framekey].duration,
  }));
  resource.meta.frameTags.map(({ name, from, to }) => {
    spritesheet[name] = [];
    for (let i = from; i <= to; i++) {
      spritesheet[name].push(textures[i]);
    }
  });
};

const container = new PIXI.Container();
const winScreen = new PIXI.Container();
const failScreen = new PIXI.Container();
container.interactive = true;
container.hitArea = new PIXI.Rectangle(0, 0, 640, 320);
container.on("click", (e) => gameState.unicorn.jump());
container.on("touchend", (e) => gameState.unicorn.jump());
container.visible = false;

const cheeseSheet = {};
const cloudsSheet = {};
const unicornSheet = {};
const mouseSheet = {};
let healthTexture;

const baseHeight = app.screen.height - 86;

const createUnicorn = () => {
  const unicorn = new PIXI.AnimatedSprite(unicornSheet["walk"]);
  unicorn.anchor.set(1, 0);
  unicorn.x = app.screen.width / 2;
  unicorn.y = baseHeight;
  unicorn.health = 3;
  unicorn.scale.set(4);
  unicorn.play();
  gameState.unicorn = unicorn;
  container.addChild(unicorn);
  unicorn.vy = 0;
  unicorn.gy = 0.5;
  unicorn.jumping = false;
  unicorn.jump = () => {
    if (!unicorn.jumping) {
      unicorn.vy = -10;
      unicorn.jumping = true;
      unicorn.stop();
    }
  };
};

const createHealth = () => {
  for (let i = 0; i < 3; i++) {
    const heart = new PIXI.Sprite(healthTexture);
    heart.scale.set(2);
    heart.anchor.set(1, 0);
    heart.x = app.screen.width - (32 + 5) * i - 5;
    heart.y = 16;
    gameState.hearts.push(heart);
    container.addChild(heart);
  }
};

const spawnMouse = () => {
  if (Math.random() < 0.6 && gameState.mouseLastSpawned > 100) {
    const mouse = new PIXI.AnimatedSprite(mouseSheet["walk"]);
    mouse.anchor.set(1, 0);
    mouse.x = app.screen.width;

    mouse.y = app.screen.height - 68;
    mouse.scale.set(3);
    mouse.play();
    container.addChild(mouse);
    gameState.mice.push(mouse);
    gameState.mouseLastSpawned = -1;
  }
  gameState.mouseLastSpawned++;
};

const spawnCheese = () => {
  if (Math.random() < 0.5 && gameState.cheeseLastSpawned > 50) {
    const cheese = new PIXI.AnimatedSprite(cheeseSheet["idle"]);
    cheese.anchor.set(1, 0);
    cheese.x = app.screen.width;

    const heightOffset = Math.random() > 0.3 ? 100 : 0;
    cheese.y = app.screen.height - 64 - heightOffset;
    cheese.scale.set(2);
    cheese.play();
    container.addChild(cheese);
    gameState.cheeses.push(cheese);
    gameState.cheeseLastSpawned = -1;
  }
  gameState.cheeseLastSpawned++;
};

const spawnClouds = () => {
  if (Math.random() < 0.01 && gameState.cloudLastSpawned > 50) {
    const cloudIdx = Math.random() > 0.5 ? 1 : 2;
    const cloud = new PIXI.Sprite(cloudsSheet[`cloud${cloudIdx}`][0].texture);
    cloud.anchor.set(1, 0);
    cloud.animationSpeed = 0.5;
    cloud.x = app.screen.width;

    const heightOffset = Math.random() * 100;
    cloud.y = heightOffset;
    cloud.scale.set(2);
    container.addChild(cloud);
    gameState.clouds.push(cloud);
    gameState.cloudLastSpawned = -1;
  }
  gameState.cloudLastSpawned++;
};

const updateClouds = (delta) => {
  gameState.clouds.map((cloud) => {
    cloud.position.x -= gameState.cloudSpeed * delta;

    if (cloud.position.x < 0) {
      cloud.dead = true;
    }
  });

  for (let i = 0; i < gameState.clouds.length; i++) {
    if (gameState.clouds[i].dead) {
      container.removeChild(gameState.clouds[i]);
      gameState.clouds.splice(i, 1);
    }
  }
};

const intersects = (a, b, shrinkA = 0, shrinkB = 0) => {
  const aBox = a.getBounds();
  const bBox = b.getBounds();
  return (
    aBox.x + aBox.width - shrinkA > bBox.x + shrinkB &&
    aBox.x - shrinkA < bBox.x + bBox.width - shrinkB &&
    aBox.y + aBox.height > bBox.y + shrinkB &&
    aBox.y < bBox.y + bBox.height + shrinkB
  );
};

const updateCheese = (delta) => {
  gameState.cheeses.map((cheese) => {
    cheese.position.x -=
      gameState.cheeseSpeed * (1 + 0.4 * gameState.level) * delta;

    if (cheese.position.x < 0) {
      cheese.dead = true;
    } else if (!cheese.dead === true) {
      if (intersects(gameState.unicorn, cheese)) {
        cheese.dead = true;
        gameState.score += 1;
        if (gameState.score % 10 === 0) {
          gameState.level++;
        }
      }
    }
  });

  for (let i = 0; i < gameState.cheeses.length; i++) {
    if (gameState.cheeses[i].dead) {
      container.removeChild(gameState.cheeses[i]);
      gameState.cheeses.splice(i, 1);
    }
  }
};

const updateMouse = (delta) => {
  gameState.mice.map((mouse) => {
    mouse.position.x -=
      gameState.mouseSpeed * (1 + 0.2 * gameState.level) * delta;

    if (mouse.position.x < 0) {
      mouse.dead = true;
    } else if (!mouse.dead === true) {
      if (intersects(gameState.unicorn, mouse, 10, 20)) {
        mouse.dead = true;
        gameState.unicorn.health -= 1;
        container.removeChild(gameState.hearts[0]);
        gameState.hearts.splice(0, 1);

        if (gameState.unicorn.health === 0) {
          endGame();
        }
      }
    }
  });

  for (let i = 0; i < gameState.mice.length; i++) {
    if (gameState.mice[i].dead) {
      container.removeChild(gameState.mice[i]);
      gameState.mice.splice(i, 1);
    }
  }
};

const updateGroundTiles = (delta) => {
  gameState.groundTiles.map((tile) => {
    tile.position.x -= 3 * (1 + 0.4 * gameState.level) * delta;
  });
  const firstTile = gameState.groundTiles[0];
  if (gameState.groundTiles[0].position.x < -32) {
    tile = gameState.groundTiles[0];
    tile.position.x =
      gameState.groundTiles[gameState.groundTiles.length - 1].position.x + 32;
    gameState.groundTiles = [
      ...gameState.groundTiles.slice(1, gameState.groundTiles.length),
      tile,
    ];
  }
};

const endGame = () => {
  container.visible = false;
  if (gameState.score >= 40) {
    winScreen.visible = true;
  } else {
    failScreen.visible = true;
  }
};

const updateScoreText = () => {
  gameState.scoreText.text = `score: ${gameState.score}`;
};

const updateUnicorn = (delta) => {
  const unicorn = gameState.unicorn;
  unicorn.y = unicorn.y + unicorn.vy * delta;
  if (unicorn.y > baseHeight) unicorn.y = baseHeight;

  if (unicorn.y === baseHeight) {
    unicorn.jumping = false;
    unicorn.play();
  }
  if (unicorn.jumping) {
    unicorn.vy = Math.max(unicorn.vy + unicorn.gy, -10 * delta);
  }
};

const mainLoop = (delta, frame) => {
  spawnCheese();
  spawnClouds();
  spawnMouse();
  updateScoreText();
  updateCheese(delta);
  updateClouds(delta);
  updateUnicorn(delta);
  updateMouse(delta);
  updateGroundTiles(delta);
};

app.stage.addChild(container);
app.stage.addChild(winScreen);
app.stage.addChild(failScreen);

app.stop();

app.loader.add("cheeseSpritesheet", "assets/cheese.json");
app.loader.add("unicorn", "assets/unicorn.json");
app.loader.add("clouds", "assets/clouds.json");
app.loader.add("mouse", "assets/mouse.json");
app.loader.add("health", "assets/health.png");

app.loader.load((loader, resources) => {
  loadSheet("cheeseSpritesheet", cheeseSheet, resources);
  loadSheet("clouds", cloudsSheet, resources);
  loadSheet("unicorn", unicornSheet, resources);
  loadSheet("mouse", mouseSheet, resources);
  gameState.scoreText.x = 16;
  gameState.scoreText.y = 16;
  container.addChild(gameState.scoreText);

  const groundTexture = new PIXI.Texture.from("assets/ground.png");
  const winScreenTexture = new PIXI.Texture.from("assets/win.png");
  const failScreenTexture = new PIXI.Texture.from("assets/game_over.png");
  healthTexture = new PIXI.Texture.from("assets/health.png");

  for (let i = 0; i < 21; i++) {
    const groundTile = new PIXI.Sprite(groundTexture);
    groundTile.anchor.set(0, 1);
    groundTile.x = i * 32;
    groundTile.y = app.screen.height;
    groundTile.scale.set(2);
    gameState.groundTiles.push(groundTile);
    container.addChild(groundTile);
  }
  const failSprite = new PIXI.Sprite(failScreenTexture);
  failSprite.anchor.set(0.5, 0.5);
  failSprite.x = app.view.width / 2;
  failSprite.y = app.view.height / 2;
  failScreen.addChild(failSprite);

  const winSprite = new PIXI.Sprite(winScreenTexture);
  winSprite.anchor.set(0.5, 0.5);
  winSprite.x = app.view.width / 2;
  winSprite.y = app.view.height / 2;
  winScreen.addChild(winSprite);

  createUnicorn();
  createHealth();
  container.visible = true;
  winScreen.visible = false;
  failScreen.visible = false;

  app.ticker.add(mainLoop);
  app.start();
});
