import Matter from 'matter-js';
import LevelGenerator from './levelGenerator';
import './styles.css';

// Matter.js module aliases
const { Engine, Render, World, Bodies, Body, Events, Composite, Common, Vector, Sleeping } = Matter;

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 650;
const PEG_RADIUS = 10;
const BALL_RADIUS = 10;
const LAUNCHER_X = CANVAS_WIDTH / 2;
const LAUNCHER_Y = 40;
const PEG_FADE_TIME = 2000; // Time in ms before pegs disappear after being hit
const BUCKET_WIDTH = 100;
const BUCKET_HEIGHT = 20;
const GAME_BORDER_RIGHT = CANVAS_WIDTH; // Right edge of game area
const PROGRESS_METER_WIDTH = 180; // Width for progress meters including labels and indicators - increased from 160 for more right padding

// Update canvas width to include progress meters
const TOTAL_CANVAS_WIDTH = CANVAS_WIDTH + PROGRESS_METER_WIDTH;

// Background animation properties
let backgroundPattern = [];
let backgroundParticles = [];
let backgroundIntensity = 1.0; // Increases with level
const BACKGROUND_PARTICLE_COUNT = 40;
const BACKGROUND_MAX_INTENSITY = 1.8; // Reduced from 2.5 to further tone down extreme effects
const BACKGROUND_MAX_PARTICLES = 80; // Reduced from 100
const BACKGROUND_FRAME_SKIP = 1;
let backgroundFrameCounter = 0;
// Add more dramatic color schemes for higher levels
const BACKGROUND_COLORS = [
    ['#001133', '#002266', '#0044AA'], // Deep blue with highlight
    ['#330011', '#660022', '#AA0044'], // Deep red with highlight
    ['#002211', '#004422', '#008844'], // Deep green with highlight
    ['#221100', '#442200', '#884400'], // Deep brown with highlight
    ['#110022', '#220044', '#440088'], // Deep purple with highlight
    // More unsettling color schemes for higher levels (toned down)
    ['#331111', '#662222', '#AA4444'], // Muted red (less intense than blood red)
    ['#113311', '#226622', '#44AA44'], // Muted green (less toxic looking)
    ['#221133', '#442266', '#6644AA'], // Softened purple
    ['#222211', '#443322', '#665533'], // Softer amber
    ['#111122', '#222244', '#3333AA']  // Softer blue void
];
// Selected background color scheme for current level
let currentBackgroundScheme = BACKGROUND_COLORS[0];
// Pre-calculate grid lines to avoid recalculating each frame
let backgroundGridLines = { horizontal: [], vertical: [] };
// Debug mode for level skipping
let waitingForLevelInput = false;
let levelInputBuffer = '';
// Add visual effect tracking for unsettling effects
let visualDistortionLevel = 0;
let screenShakeAmount = 0;

// Add level transition effect variable
let levelTransitionEffect = {
    active: false,
    startTime: 0,
    duration: 1000, // 1 second transition
    nextLevel: 1
};

// Add shop state variables
let shopActive = false;
let currency = 0;
let totalRunBalls = 10; // Total balls for the entire run
const ballCost = 100; // Currency cost per ball

// Game state
let score = 0;
let ballsRemaining = 10;
let isAiming = true; // Always in aiming mode to show the trajectory line
let aimAngle = Math.PI / 2; // Straight down
let aimPower = 0.5; // Increased power for better reach to corners
let hitPegs = []; // Array to store hit pegs and their removal timers
let currentLevel = 1;
let levelCompleted = false;
let bucketDirection = 1; // Direction for automatic bucket movement
let bucketSpeed = 2; // Speed for bucket movement
let colorThresholds = [0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25]; // Default thresholds for level completion (25% of each color)
let gameOver = false; // Track game over state

// Initialize the level generator
const levelGenerator = new LevelGenerator(PEG_RADIUS, CANVAS_WIDTH, CANVAS_HEIGHT);

// Initialize Matter.js engine and world with improved settings
const engine = Engine.create({
    enableSleeping: true,
    constraintIterations: 4,
    positionIterations: 8,
    velocityIterations: 8
});

const world = engine.world;
world.gravity.y = 0.5; // Reduce gravity for slower falling

// Create renderer
const canvas = document.getElementById('gameCanvas');
canvas.width = TOTAL_CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: TOTAL_CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        wireframes: false,
        background: '#003366', // Dark blue background, similar to old RuneScape
        transparent: false
    }
});

// Create walls - make them thick and "blocky" for the retro feel
const walls = [
    Bodies.rectangle(CANVAS_WIDTH / 2, -30, CANVAS_WIDTH, 60, { 
        isStatic: true,
        render: { fillStyle: '#663300' } // Brown, wood-like color
    }), // Top
    Bodies.rectangle(-30, CANVAS_HEIGHT / 2, 60, CANVAS_HEIGHT, { 
        isStatic: true, 
        render: { fillStyle: '#663300' }
    }), // Left
    Bodies.rectangle(CANVAS_WIDTH + 30, CANVAS_HEIGHT / 2, 60, CANVAS_HEIGHT, { 
        isStatic: true,
        render: { fillStyle: '#663300' }
    }) // Right
];

// Create a single, cleaner launcher at the top
const launcherBase = Bodies.circle(LAUNCHER_X, LAUNCHER_Y, 30, {
    isStatic: true,
    label: 'launcher_base',
    render: {
        fillStyle: '#FF6600',
        strokeStyle: '#000000',
        lineWidth: 3
    }
});

// Remove bucket section - we don't need those white rectangles
const buckets = [];

// Function to create a peg with the specified parameters
function createPeg(x, y, colorIndex) {
    // Extended color palette - more colors for higher levels
    const pegColors = [
        '#FF0000', // Red (0)
        '#0000FF', // Blue (1)
        '#FFFF00', // Yellow (2)
        '#00FF00', // Green (3)
        '#FF00FF', // Magenta (4) - appears in higher levels
        '#00FFFF', // Cyan (5) - appears in higher levels
        '#FF8800', // Orange (6) - appears in higher levels
        '#8800FF'  // Purple (7) - appears in higher levels
    ];
    
    // Ensure colorIndex is within the available colors for current level
    const availableColors = getAvailableColorsForLevel(currentLevel);
    if (colorIndex >= availableColors) {
        // If invalid color index, replace with a random available color
        colorIndex = Math.floor(Math.random() * availableColors);
        console.log(`Replacing out-of-range color index ${colorIndex} with ${colorIndex % availableColors}`);
    }
    
    // Create a perfect circle for physics with no additional properties that would affect the hitbox
    const peg = Bodies.circle(x, y, PEG_RADIUS, {
        isStatic: true,
        label: 'peg',
        render: { 
            fillStyle: 'transparent', // Make invisible in Matter.js renderer
            strokeStyle: 'transparent', // Make invisible in Matter.js renderer
            lineWidth: 0,
            opacity: 0.0 // Make completely transparent in Matter.js renderer
        },
        originalColor: pegColors[colorIndex], // Store original color for custom rendering
        colorGroup: colorIndex, // Keep track of which color group this peg belongs to
        isHit: false,
        restitution: 0.8, // Make pegs a bit bouncy
        friction: 0.001, // Low friction
        frictionAir: 0, // No air friction for physics bodies
        slop: 0, // Remove the slop factor which can affect collision precision
        animationOffset: Math.random() * 1000 // Random offset for animation timing (0-1000ms)
    });
    
    // Directly override Matter.js internal rendering for this body
    peg.render.visualComponent = 'peg';
    
    return peg;
}

// Create pegs array
const pegs = [];

// Create peg color tracking objects
let pegCountsByColor = [0, 0, 0, 0, 0, 0, 0, 0]; // Counts for all 8 possible colors
let hitPegCountsByColor = [0, 0, 0, 0, 0, 0, 0, 0]; // Counts for hit pegs by color

// Create a bouncy bucket at the bottom (instead of catching)
const bucket = Bodies.fromVertices(
    CANVAS_WIDTH / 2, 
    CANVAS_HEIGHT - 30,
    [[
        // Left scoop edge - extended further with shallower angle
        { x: -BUCKET_WIDTH/2 - 40, y: BUCKET_HEIGHT/2 + 5 },  // Extended much further
        { x: -BUCKET_WIDTH/2 - 35, y: BUCKET_HEIGHT/4 + 2 },  // Shallower angle
        { x: -BUCKET_WIDTH/2 - 30, y: BUCKET_HEIGHT/8 },      // More points for smoother transition 
        { x: -BUCKET_WIDTH/2 - 25, y: 0 },
        { x: -BUCKET_WIDTH/2 - 15, y: -BUCKET_HEIGHT/5 },
        { x: -BUCKET_WIDTH/2 - 10, y: -BUCKET_HEIGHT/4 },
        { x: -BUCKET_WIDTH/2 - 5, y: -BUCKET_HEIGHT/3 },
        { x: -BUCKET_WIDTH/2, y: -BUCKET_HEIGHT/4 },
        // Bottom surface curve points
        { x: -BUCKET_WIDTH/4, y: -BUCKET_HEIGHT/2 },
        { x: 0, y: -BUCKET_HEIGHT*0.6 },
        { x: BUCKET_WIDTH/4, y: -BUCKET_HEIGHT/2 },
        { x: BUCKET_WIDTH/2, y: -BUCKET_HEIGHT/4 },
        // Right scoop edge - extended further with shallower angle
        { x: BUCKET_WIDTH/2 + 5, y: -BUCKET_HEIGHT/3 },
        { x: BUCKET_WIDTH/2 + 10, y: -BUCKET_HEIGHT/4 },
        { x: BUCKET_WIDTH/2 + 15, y: -BUCKET_HEIGHT/5 },
        { x: BUCKET_WIDTH/2 + 25, y: 0 },
        { x: BUCKET_WIDTH/2 + 30, y: BUCKET_HEIGHT/8 },      // More points for smoother transition
        { x: BUCKET_WIDTH/2 + 35, y: BUCKET_HEIGHT/4 + 2 },  // Shallower angle
        { x: BUCKET_WIDTH/2 + 40, y: BUCKET_HEIGHT/2 + 5 }   // Extended much further
    ]], 
    { 
        isStatic: true,
        label: 'bucket',
        restitution: 1.4, // Increased bounciness
        friction: 0.001, // Low friction for smooth bounces
        render: { 
            fillStyle: '#4488CC',
            strokeStyle: '#000000',
            lineWidth: 2
        }
    }
);

// Add walls, buckets, and launcher to the world
// We'll add pegs after generating the level
Composite.add(world, [...walls, ...buckets, bucket, launcherBase]);

// Initial level setup
resetLevel();

// Initialize background
generateBackgroundPattern(currentLevel);

// Create a ball
const createBall = () => {
    return Bodies.circle(
        LAUNCHER_X, 
        LAUNCHER_Y, // Position at launcher center
        BALL_RADIUS, 
        {
            restitution: 0.8,
            friction: 0.001,
            frictionAir: 0.0005, // Reduced from 0.001 for less air resistance
            label: 'ball',
            collisionFilter: {
                category: 0x0002,
                mask: 0xFFFFFFFF
            },
            render: { 
                fillStyle: 'transparent', // Make original rendering transparent
                strokeStyle: 'transparent',
                lineWidth: 0
            },
            // Add rotation tracking properties
            spinAngle: 0,
            spinSpeed: 0.05 + Math.random() * 0.1 // Random spin speed between 0.05 and 0.15
        }
    );
};

// Handle mouse/touch input for aiming and shooting
canvas.addEventListener('mousemove', (event) => {
    // Calculate cursor position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calculate angle for launcher
    const dx = x - LAUNCHER_X;
    const dy = y - LAUNCHER_Y;
    aimAngle = Math.atan2(dy, dx);
    
    // Restrict to 180 degrees downwards (0 to PI)
    if (aimAngle < 0) {
        aimAngle = 0;
    } else if (aimAngle > Math.PI) {
        aimAngle = Math.PI;
    }
});

// Modify the canvas click event handler to handle game over state
canvas.addEventListener('mousedown', (event) => {
    // Calculate cursor position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Handle game over restart
    if (gameOver) {
        restartGame();
        return;
    }
    
    // Handle shop interactions
    if (shopActive) {
        // Buy balls button
        const buyBallsX = CANVAS_WIDTH / 2 - 175;
        const buyBallsY = CANVAS_HEIGHT / 2 - 70;
        const buyBallsWidth = 350;
        const buyBallsHeight = 60;
        
        if (clickX >= buyBallsX && clickX <= buyBallsX + buyBallsWidth &&
            clickY >= buyBallsY && clickY <= buyBallsY + buyBallsHeight) {
            purchaseBalls(1);
            return;
        }
        
        // Continue button
        const continueX = CANVAS_WIDTH / 2 - 100;
        const continueY = CANVAS_HEIGHT / 2 + 100;
        const continueWidth = 200;
        const continueHeight = 50;
        
        if (clickX >= continueX && clickX <= continueX + continueWidth &&
            clickY >= continueY && clickY <= continueY + continueHeight) {
            continueToNextLevel();
            return;
        }
        
        return;
    }
    
    if (ballsRemaining > 0 && !levelCompleted) {
        // Create and launch ball
        const ball = createBall();
        
        // Calculate launch position from launcher center in aim direction
        const launchDistance = 50; // Fixed distance from launcher center
        const launchX = LAUNCHER_X + Math.cos(aimAngle) * launchDistance;
        const launchY = LAUNCHER_Y + Math.sin(aimAngle) * launchDistance;
        
        // Position the ball at the launch position
        Body.setPosition(ball, {
            x: launchX,
            y: launchY
        });
        
        // Add the ball to the world first, then apply velocity
        World.add(world, ball);
        
        // Use same velocity calculation as in the trajectory prediction
        const forceMagnitude = aimPower * 0.1;
        const velX = Math.cos(aimAngle) * forceMagnitude * 100;
        const velY = Math.sin(aimAngle) * forceMagnitude * 100;
        
        // Use setVelocity with the exact same values used in the trajectory prediction
        Body.setVelocity(ball, {
            x: velX,
            y: velY
        });
        
        ballsRemaining--;
        totalRunBalls--;
    }
});

// Process peg removal - keep pegs gray until removal time
function processHitPegs() {
    const currentTime = Date.now();
    const pegsToRemove = [];
    
    // Check which pegs need to be removed
    for (let i = hitPegs.length - 1; i >= 0; i--) {
        const { peg, hitTime } = hitPegs[i];
        const timeElapsed = currentTime - hitTime;
        
        // If enough time has passed, mark for removal
        if (timeElapsed >= PEG_FADE_TIME) {
            pegsToRemove.push(peg);
            hitPegs.splice(i, 1);
        }
        // Remove the gradual opacity change - pegs stay gray until removed
    }
    
    // Remove pegs marked for removal
    if (pegsToRemove.length > 0) {
        // Find all balls in the world before removing pegs
        const balls = Composite.allBodies(world).filter(body => body.label === 'ball');
        
        // Store peg positions before removing them
        const removedPegPositions = pegsToRemove.map(peg => ({ x: peg.position.x, y: peg.position.y }));
        
        // Remove the pegs
        Composite.remove(world, pegsToRemove);
        
        // Check each ball to see if it might have been resting on a removed peg
        for (const ball of balls) {
            let needsImpulse = false;
            
            // Check if ball velocity is very low (indicating it might be resting)
            const ballVelocity = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
            if (ballVelocity < 0.2) {
                // Check if ball is near any of the removed peg positions
                for (const pegPos of removedPegPositions) {
                    const dx = ball.position.x - pegPos.x;
                    const dy = ball.position.y - pegPos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // If ball is close to where a peg was removed, it might have been resting on it
                    if (distance < PEG_RADIUS + BALL_RADIUS + 5) {
                        needsImpulse = true;
                        break;
                    }
                }
            }
            
            // Apply a small impulse to ensure the ball starts moving if it was resting on a removed peg
            if (needsImpulse) {
                // Don't apply any forces or velocities - just wake the body up if it's sleeping
                if (ball.isSleeping) {
                    // Just wake the ball up and let gravity do the work
                    Body.setStatic(ball, false); // Ensure the ball isn't static
                    Sleeping.set(ball, false); // Wake up the ball using the correct Matter.js API
                }
                
                // Clear any collision caching that might prevent the ball from responding to gravity
                ball.collisionFilter.group = 0;
            }
        }
    }
}

// Handle collisions for scoring
Events.on(engine, 'collisionStart', (event) => {
    const pairs = event.pairs;
    
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        
        // Check if collision is between ball and peg
        if ((pair.bodyA.label === 'ball' && pair.bodyB.label === 'peg') ||
            (pair.bodyA.label === 'peg' && pair.bodyB.label === 'ball')) {
            
            // Determine which body is the peg
            const peg = pair.bodyA.label === 'peg' ? pair.bodyA : pair.bodyB;
            
            // Only process if the peg hasn't been hit already
            if (!peg.isHit) {
                // Mark peg as hit
                peg.isHit = true;
                
                // Update color counts for level progression
                hitPegCountsByColor[peg.colorGroup]++;
                
                // Increase score
                score += 10;
                
                // Change peg color to indicate it was hit
                peg.render.fillStyle = '#999999';
                
                // Add peg to the hit list with current time
                hitPegs.push({
                    peg: peg,
                    hitTime: Date.now()
                });
            }
        }
        
        // When ball hits bucket, add points but don't catch the ball
        if ((pair.bodyA.label === 'ball' && pair.bodyB.label === 'bucket') ||
            (pair.bodyA.label === 'bucket' && pair.bodyB.label === 'ball')) {
            // Add points for hitting the bucket
            score += 20;
            
            // Determine which body is the ball
            const ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
            const bucket = pair.bodyA.label === 'bucket' ? pair.bodyA : pair.bodyB;
            
            // Calculate the angle of impact (vertical vs horizontal bounce)
            const ballPos = ball.position;
            const bucketPos = bucket.position;
            const dx = ballPos.x - bucketPos.x;
            const dy = ballPos.y - bucketPos.y;
            
            // Get current velocity
            const currentVelocity = ball.velocity;
            
            // Calculate boost factor based on where the ball hit the bucket
            // Higher boost on the edges, lower in the middle
            const normalizedX = Math.abs(dx) / (BUCKET_WIDTH/2 + 40); // Normalize position (0 = center, 1 = edge)
            const edgeBoost = 1.3 + (normalizedX * 0.7); // 1.3x in center, up to 2.0x on edges
            
            // Apply a stronger impulse for more dramatic bounces
            Body.setVelocity(ball, {
                x: currentVelocity.x * edgeBoost, // Amplify horizontal velocity
                y: currentVelocity.y * edgeBoost  // Amplify vertical velocity
            });
            
            // Add visual effect for the bounce
            // Create a small "spark" effect where the ball hit the bucket
            createBounceEffect(ballPos.x, ballPos.y);
        }
    }
});

// Fixed timestep for physics simulation
const fixedTimeStep = 1000 / 60; // 60 fps
let lastTime = 0;
let accumulator = 0;

// Modify gameLoop to check for game over state
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Accumulate time since last frame
    accumulator += deltaTime;
    
    // Update physics with fixed timestep
    while (accumulator >= fixedTimeStep) {
        Engine.update(engine, fixedTimeStep);
        accumulator -= fixedTimeStep;
    }
    
    // Process hit pegs for removal
    processHitPegs();
    
    // Update background animation
    updateBackgroundAnimation(deltaTime);
    
    // Remove balls that have fallen off the screen
    const bodies = Composite.allBodies(world);
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        if (body.label === 'ball' && body.position.y > CANVAS_HEIGHT + 100) {
            World.remove(world, body);
            // No decrement needed here - we now only decrement when shooting balls
        }
    }
    
    // Move bucket back and forth automatically
    const bucketPos = bucket.position;
    // Adjust boundary checks to account for the extended corners
    if (bucketPos.x > CANVAS_WIDTH - BUCKET_WIDTH/2 - 40) { // Increased buffer to match extended corners
        bucketDirection = -1;
    } else if (bucketPos.x < BUCKET_WIDTH/2 + 40) { // Increased buffer to match extended corners
        bucketDirection = 1;
    }
    
    Body.setPosition(bucket, {
        x: bucketPos.x + (bucketDirection * bucketSpeed),
        y: bucketPos.y
    });
    
    // Check if level is completed
    checkLevelCompletion();
    
    // Check if game is over (no balls remaining and no active balls)
    const activeBalls = bodies.filter(b => b.label === 'ball');
    if (ballsRemaining <= 0 && activeBalls.length === 0 && !levelCompleted && !shopActive) {
        // Check if player is completely out of balls for the entire run
        if (totalRunBalls <= 0) {
            gameOver = true;
        } else {
            // They're out of balls for this level, but still have some left
            checkLevelCompletion();
        }
    }
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Reset level and set up new pegs
function resetLevel() {
    // Remove all existing pegs
    const bodies = Composite.allBodies(world);
    const pegsToRemove = bodies.filter(body => body.label === 'peg');
    Composite.remove(world, pegsToRemove);
    
    // Clear hit pegs array
    hitPegs = [];
    
    // Clear any active balls
    const ballsToRemove = bodies.filter(body => body.label === 'ball');
    Composite.remove(world, ballsToRemove);
    
    // Reset peg counts
    pegCountsByColor = [0, 0, 0, 0, 0, 0, 0, 0];
    hitPegCountsByColor = [0, 0, 0, 0, 0, 0, 0, 0];
    
    // Generate new thresholds for this level using the level generator
    colorThresholds = levelGenerator.getColorThresholds(currentLevel);
    
    // Clear the global pegs array
    pegs.length = 0;
    
    // Generate level using the level generator
    const pegPositions = levelGenerator.generateLevel(currentLevel);
    
    // Create pegs from the generated positions
    for (const pos of pegPositions) {
        const peg = createPeg(pos.x, pos.y, pos.colorIndex);
        pegs.push(peg);
        
        // Track peg count by color
        pegCountsByColor[pos.colorIndex]++;
    }
    
    // Add new pegs to the world
    Composite.add(world, pegs);
    
    // Reset level completion flag
    levelCompleted = false;
    
    // Reset ball count only on game restart, not between levels
    if (currentLevel === 1) {
        totalRunBalls = 10;
        ballsRemaining = totalRunBalls;
    } else {
        ballsRemaining = totalRunBalls;
    }
    
    // Increase bucket speed slightly for higher levels
    bucketSpeed = Math.min(5, 2 + (currentLevel * 0.3));
    
    // Generate new background pattern for the level
    generateBackgroundPattern(currentLevel);
}

// Check if all pegs have been cleared
function checkLevelCompletion() {
    // If already in level complete state, don't check again
    if (levelCompleted) return;
    
    // Check if we've hit at least the threshold % of pegs of each color
    let allColorsHitThreshold = true;
    
    for (let i = 0; i < 8; i++) {
        const colorHitPercentage = pegCountsByColor[i] > 0 ? 
            hitPegCountsByColor[i] / pegCountsByColor[i] : 1;
        
        if (colorHitPercentage < colorThresholds[i]) {
            allColorsHitThreshold = false;
            break;
        }
    }
    
    // If the threshold has been met for all colors, level is complete
    if (allColorsHitThreshold) {
        levelCompleted = true;
        
        // Give bonus for completing level (higher bonus for higher levels)
        const levelBonus = 500 + (currentLevel * 50);
        score += levelBonus;
        
        // Convert level score to currency for shop
        currency += score;
        
        // Show level complete message for 2 seconds, then shop
        setTimeout(() => {
            // Show shop after brief delay
            shopActive = true;
        }, 2000);
    }
}

// Function to restart the game
function restartGame() {
    // Reset game state
    score = 0;
    currency = 0;
    totalRunBalls = 10;
    ballsRemaining = totalRunBalls;
    currentLevel = 1;
    levelCompleted = false;
    gameOver = false;
    shopActive = false;
    
    // Reset level transition effect
    levelTransitionEffect = {
        active: false,
        startTime: 0,
        duration: 1000,
        nextLevel: 1
    };
    
    // Reset level with new pegs
    resetLevel();
}

// Proceed to next level after shopping
function continueToNextLevel() {
    shopActive = false;
    levelCompleted = false;
    score = 0; // Reset score for new level
    currentLevel++;
    resetLevel();
}

// Purchase balls in the shop
function purchaseBalls(count) {
    if (currency >= ballCost * count) {
        // Cap total balls at 10
        const maxBallsToAdd = Math.min(count, 10 - totalRunBalls);
        
        if (maxBallsToAdd <= 0) {
            // Already at max balls
            return false;
        }
        
        currency -= ballCost * maxBallsToAdd;
        totalRunBalls += maxBallsToAdd;
        ballsRemaining += maxBallsToAdd;
        return true;
    }
    return false;
}

// Draw shop UI with Cruelty Squad / early 2000's internet aesthetic
function drawShop() {
    const ctx = render.context;
    
    // Pixelated rendering for retro effect
    ctx.imageSmoothingEnabled = false;
    
    // Create dithered background effect - simplified
    ctx.fillStyle = '#000811';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw glitchy background pattern with reduced intensity
    for (let y = 0; y < CANVAS_HEIGHT; y += 8) { // Increased spacing
        if (Math.random() > 0.7) { // Reduced frequency
            const noiseOffset = Math.sin(y * 0.05) * 3; // Reduced amplitude
            const lineWidth = CANVAS_WIDTH;
            const alpha = 0.05 + Math.random() * 0.03; // Reduced alpha
            const hue = (y + Date.now() * 0.01) % 360; // Slower animation
            
            ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${alpha})`;
            ctx.fillRect(noiseOffset, y, lineWidth, 2);
        }
    }
    
    // Glitchy overlay rectangles - reduced amount and opacity
    for (let i = 0; i < 4; i++) { // Reduced count from 8 to 4
        if (Math.random() > 0.8) { // Less frequent
            const x = Math.random() * CANVAS_WIDTH;
            const y = Math.random() * CANVAS_HEIGHT;
            const width = 30 + Math.random() * 100; // Smaller
            const height = 3 + Math.random() * 8; // Smaller
            const alpha = 0.05 + Math.random() * 0.1; // Lower alpha
            
            ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 155)}, ${alpha})`;
            ctx.fillRect(x, y, width, height);
        }
    }
    
    // Shop container - web 1.0 style with more subtle gradient
    const shopGradient = ctx.createLinearGradient(
        CANVAS_WIDTH / 2 - 225, CANVAS_HEIGHT / 2 - 200,
        CANVAS_WIDTH / 2 + 225, CANVAS_HEIGHT / 2 + 200
    );
    shopGradient.addColorStop(0, '#002040');
    shopGradient.addColorStop(0.5, '#003A1C');
    shopGradient.addColorStop(1, '#332211');
    
    ctx.fillStyle = shopGradient;
    ctx.fillRect(CANVAS_WIDTH / 2 - 225, CANVAS_HEIGHT / 2 - 200, 450, 400);
    
    // Create "window" border style with multiple lines
    ctx.lineWidth = 1;
    // Inner border - dashed "selection" style
    ctx.strokeStyle = '#22DDAA';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(CANVAS_WIDTH / 2 - 222, CANVAS_HEIGHT / 2 - 197, 444, 394);
    ctx.setLineDash([]);
    
    // Outer heavy border
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#66AACC';
    ctx.strokeRect(CANVAS_WIDTH / 2 - 225, CANVAS_HEIGHT / 2 - 200, 450, 400);
    
    // Add "web 1.0" decorative elements - corner embellishments
    const cornerSize = 15; // Reduced size
    
    // Top left corner
    ctx.fillStyle = '#FF3388';
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - 225, CANVAS_HEIGHT / 2 - 200);
    ctx.lineTo(CANVAS_WIDTH / 2 - 225 + cornerSize, CANVAS_HEIGHT / 2 - 200);
    ctx.lineTo(CANVAS_WIDTH / 2 - 225, CANVAS_HEIGHT / 2 - 200 + cornerSize);
    ctx.fill();
    
    // Top right corner
    ctx.fillStyle = '#33FF88';
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 + 225, CANVAS_HEIGHT / 2 - 200);
    ctx.lineTo(CANVAS_WIDTH / 2 + 225 - cornerSize, CANVAS_HEIGHT / 2 - 200);
    ctx.lineTo(CANVAS_WIDTH / 2 + 225, CANVAS_HEIGHT / 2 - 200 + cornerSize);
    ctx.fill();
    
    // Bottom left corner
    ctx.fillStyle = '#8833FF';
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 - 225, CANVAS_HEIGHT / 2 + 200);
    ctx.lineTo(CANVAS_WIDTH / 2 - 225 + cornerSize, CANVAS_HEIGHT / 2 + 200);
    ctx.lineTo(CANVAS_WIDTH / 2 - 225, CANVAS_HEIGHT / 2 + 200 - cornerSize);
    ctx.fill();
    
    // Bottom right corner
    ctx.fillStyle = '#FF8833';
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2 + 225, CANVAS_HEIGHT / 2 + 200);
    ctx.lineTo(CANVAS_WIDTH / 2 + 225 - cornerSize, CANVAS_HEIGHT / 2 + 200);
    ctx.lineTo(CANVAS_WIDTH / 2 + 225, CANVAS_HEIGHT / 2 + 200 - cornerSize);
    ctx.fill();
    
    // Shop header bar - old Windows style
    const headerHeight = 45;
    const headerGradient = ctx.createLinearGradient(
        0, CANVAS_HEIGHT / 2 - 200,
        0, CANVAS_HEIGHT / 2 - 200 + headerHeight
    );
    headerGradient.addColorStop(0, '#663322');
    headerGradient.addColorStop(0.5, '#884422');
    headerGradient.addColorStop(1, '#552211');
    
    ctx.fillStyle = headerGradient;
    ctx.fillRect(CANVAS_WIDTH / 2 - 225, CANVAS_HEIGHT / 2 - 200, 450, headerHeight);
    
    // Shop title with glitchy text effect - reduced glitch
    ctx.fillStyle = '#FFDD33';
    ctx.font = 'bold 36px "VT323", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SHOP', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 170);
    
    // Add glitchy shadow/duplicate effect to text - subtler
    ctx.fillStyle = '#FF6677';
    ctx.fillText('SHOP', CANVAS_WIDTH / 2 + 1, CANVAS_HEIGHT / 2 - 169);
    
    // Show currency with early-2000s "shiny" effect
    const currencyY = CANVAS_HEIGHT / 2 - 120;
    
    // Draw currency label with gradient fill
    ctx.font = 'bold 28px "VT323", monospace';
    // Text shadow for that sweet 2000s look
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText(`Currency: ${currency}`, CANVAS_WIDTH / 2 + 1, currencyY + 1);
    
    // Gradient text effect - more subtle
    const textGradient = ctx.createLinearGradient(
        CANVAS_WIDTH / 2 - 100, currencyY - 20,
        CANVAS_WIDTH / 2 + 100, currencyY + 10
    );
    textGradient.addColorStop(0, '#EEEE33');
    textGradient.addColorStop(0.5, '#33DDAA');
    textGradient.addColorStop(1, '#EE33AA');
    
    ctx.fillStyle = textGradient;
    ctx.fillText(`Currency: ${currency}`, CANVAS_WIDTH / 2, currencyY);
    
    // Buy balls option - web 1.0 button style
    const buyBallsX = CANVAS_WIDTH / 2 - 175;
    const buyBallsY = CANVAS_HEIGHT / 2 - 70;
    const buyBallsWidth = 350;
    const buyBallsHeight = 60;
    
    // Create 3D button effect with gradient - more subtle
    const buttonGradient = ctx.createLinearGradient(
        buyBallsX, buyBallsY,
        buyBallsX, buyBallsY + buyBallsHeight
    );
    buttonGradient.addColorStop(0, '#331155');
    buttonGradient.addColorStop(0.5, '#442266');
    buttonGradient.addColorStop(1, '#221133');
    
    ctx.fillStyle = buttonGradient;
    ctx.fillRect(buyBallsX, buyBallsY, buyBallsWidth, buyBallsHeight);
    
    // 3D button effect borders
    ctx.lineWidth = 1;
    // Light border (top, left)
    ctx.strokeStyle = '#7755AA';
    ctx.beginPath();
    ctx.moveTo(buyBallsX, buyBallsY + buyBallsHeight);
    ctx.lineTo(buyBallsX, buyBallsY);
    ctx.lineTo(buyBallsX + buyBallsWidth, buyBallsY);
    ctx.stroke();
    
    // Shadow border (bottom, right)
    ctx.strokeStyle = '#221133';
    ctx.beginPath();
    ctx.moveTo(buyBallsX, buyBallsY + buyBallsHeight);
    ctx.lineTo(buyBallsX + buyBallsWidth, buyBallsY + buyBallsHeight);
    ctx.lineTo(buyBallsX + buyBallsWidth, buyBallsY);
    ctx.stroke();
    
    // Add dithered highlight - more subtle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    for (let y = buyBallsY + 5; y < buyBallsY + 20; y += 4) {
        for (let x = buyBallsX + 5; x < buyBallsX + buyBallsWidth - 5; x += 4) {
            if ((x + y) % 8 === 0) {
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }
    
    // Button text with slight shadow
    ctx.fillStyle = '#221133';
    ctx.font = 'bold 24px "VT323", monospace';
    ctx.fillText(`Buy Ball - ${ballCost} currency each`, CANVAS_WIDTH / 2 + 1, buyBallsY + 37);
    
    ctx.fillStyle = '#DDAAFF';
    ctx.fillText(`Buy Ball - ${ballCost} currency each`, CANVAS_WIDTH / 2, buyBallsY + 35);
    
    // Current ball count - with GeoCities-style effect
    const ballCountY = CANVAS_HEIGHT / 2 + 30;
    
    // Animated "under construction" style background for ball count - more subtle
    const stripWidth = 10;
    const now = Date.now();
    for (let x = CANVAS_WIDTH / 2 - 100; x < CANVAS_WIDTH / 2 + 100; x += stripWidth) {
        const offset = Math.sin(x * 0.03 + now * 0.0005) * 3; // Slower animation, reduced amplitude
        ctx.fillStyle = (x % (stripWidth * 2) === 0) ? '#DDBB00' : '#111111';
        ctx.fillRect(x, ballCountY - 15 + offset, stripWidth, 30);
    }
    
    // Show max ball indicator
    const maxBallText = `(Max: 10)`;
    
    // Ball count text with bold 00s style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2; // Reduced from 3
    ctx.strokeText(`Current Balls: ${totalRunBalls} ${maxBallText}`, CANVAS_WIDTH / 2, ballCountY);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "VT323", monospace';
    ctx.fillText(`Current Balls: ${totalRunBalls} ${maxBallText}`, CANVAS_WIDTH / 2, ballCountY);
    
    // Continue button - toxic green style
    const continueX = CANVAS_WIDTH / 2 - 100;
    const continueY = CANVAS_HEIGHT / 2 + 100;
    const continueWidth = 200;
    const continueHeight = 50;
    
    // Toxic green gradient - more subtle
    const continueGradient = ctx.createLinearGradient(
        continueX, continueY,
        continueX, continueY + continueHeight
    );
    continueGradient.addColorStop(0, '#114422');
    continueGradient.addColorStop(0.5, '#227722');
    continueGradient.addColorStop(1, '#003300');
    
    ctx.fillStyle = continueGradient;
    ctx.fillRect(continueX, continueY, continueWidth, continueHeight);
    
    // Button border effect - brighter on top/left
    ctx.lineWidth = 1;
    // Light border (top, left)
    ctx.strokeStyle = '#55DD55';
    ctx.beginPath();
    ctx.moveTo(continueX, continueY + continueHeight);
    ctx.lineTo(continueX, continueY);
    ctx.lineTo(continueX + continueWidth, continueY);
    ctx.stroke();
    
    // Shadow border (bottom, right)
    ctx.strokeStyle = '#003300';
    ctx.beginPath();
    ctx.moveTo(continueX, continueY + continueHeight);
    ctx.lineTo(continueX + continueWidth, continueY + continueHeight);
    ctx.lineTo(continueX + continueWidth, continueY);
    ctx.stroke();
    
    // Continue text with shadow - more subtle
    ctx.fillStyle = '#002200';
    ctx.font = 'bold 28px "VT323", monospace';
    ctx.fillText('Continue', CANVAS_WIDTH / 2 + 1, continueY + 37);
    
    ctx.fillStyle = '#AAEE33';
    ctx.fillText('Continue', CANVAS_WIDTH / 2, continueY + 35);
    
    // Add marching ants selection effect around the button - slower
    const time = Date.now() % 1500 / 1500; // Slower animation
    const dashOffset = time * 12;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]); // Wider spacing
    ctx.lineDashOffset = dashOffset;
    ctx.strokeRect(continueX - 5, continueY - 5, continueWidth + 10, continueHeight + 10);
    ctx.setLineDash([]);
    
    // Restore smooth rendering
    ctx.imageSmoothingEnabled = true;
}

// Game render function - now only draws UI elements
function drawGame() {
    // Draw UI elements in a retro style
    const ctx = render.context;
    
    // Ensure full opacity
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#FFCC33'; // Gold color
    
    // Use consistent font for all UI elements
    ctx.font = '24px "VT323", monospace';
    
    // Set up consistent UI element dimensions
    const uiBoxWidth = 180;
    const uiBoxHeight = 40;
    const uiPadding = 15;
    const uiSpacing = 10;
    
    // Consistent styling function for UI boxes
    const drawUIBox = (x, y, width, text) => {
        // Draw box
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, width, uiBoxHeight);
        ctx.strokeStyle = '#FFCC33';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, uiBoxHeight);
        
        // Draw text
        ctx.fillStyle = '#FFCC33';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + width/2, y + uiBoxHeight/2);
        
        // Reset alignment for subsequent elements
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    };
    
    // Draw score in an old-school box - left aligned
    drawUIBox(uiPadding, uiPadding, uiBoxWidth, `Score: ${score}`);
    
    // Reset font and alignment
    ctx.font = '24px "VT323", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    
    // Level counter removed - level is shown in the sidebar
    
    // Draw balls remaining as visual elements instead of text
    const drawBallCounter = (x, y, width, count) => {
        // Draw container box
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, width, uiBoxHeight);
        ctx.strokeStyle = '#FFCC33';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, uiBoxHeight);
        
        // Draw "Ammo:" label
        ctx.fillStyle = '#FFCC33';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText("Ammo:", x + 10, y + uiBoxHeight/2);
        
        // Calculate space for balls
        const labelWidth = 60; // Approximate width for "Ammo:" text
        const ballAreaStart = x + labelWidth;
        const ballAreaWidth = width - labelWidth - 10; // 10px padding on right
        
        // Draw balls
        const ballRadius = 8;
        const ballSpacing = 4;
        const maxBallsPerRow = Math.floor(ballAreaWidth / ((ballRadius * 2) + ballSpacing));
        
        for (let i = 0; i < count; i++) {
            // Calculate position (possible multi-row if many balls)
            const row = Math.floor(i / maxBallsPerRow);
            const col = i % maxBallsPerRow;
            
            const ballX = ballAreaStart + col * (ballRadius * 2 + ballSpacing) + ballRadius;
            const ballY = y + uiBoxHeight/2 + (row * (ballRadius * 2 + 4) - (row > 0 ? 10 : 0));
            
            // Draw ball with glow effect
            // Outer glow
            const gradient = ctx.createRadialGradient(
                ballX, ballY, 0,
                ballX, ballY, ballRadius
            );
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.6, '#3388FF');
            gradient.addColorStop(1, '#0055CC');
            
            ctx.beginPath();
            ctx.fillStyle = gradient;
            ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Highlight
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.arc(ballX - ballRadius * 0.3, ballY - ballRadius * 0.3, ballRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Show total run balls in small text below
        ctx.fillStyle = '#AAAAAA';
        ctx.font = '14px "VT323", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Total: ${totalRunBalls}`, x + 10, y + uiBoxHeight + 15);
        ctx.textAlign = 'left'; // Reset alignment
    };
    
    // Replace the text ball counter with visual ball counter
    drawBallCounter(CANVAS_WIDTH - uiPadding - uiBoxWidth, uiPadding, uiBoxWidth, ballsRemaining);
    
    // Draw game state message when out of balls
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT / 2 - 60, 400, 120);
        ctx.strokeStyle = '#FFCC33';
        ctx.lineWidth = 4;
        ctx.strokeRect(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT / 2 - 60, 400, 120);
        
        ctx.fillStyle = '#FFCC33';
        ctx.font = '36px "VT323", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        ctx.font = '24px "VT323", monospace';
        ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
        ctx.fillText('Click to play again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.textAlign = 'left';
    }
    
    // Draw color progress meters on the right side of the screen
    const pegColors = ['#FF0000', '#0000FF', '#FFFF00', '#00FF00', '#FF00FF', '#00FFFF', '#FF8800', '#8800FF']; // Red, Blue, Yellow, Green, Magenta, Cyan, Orange, Purple
    const colorNames = ['RED', 'BLUE', 'YELLOW', 'GREEN', 'MAGENTA', 'CYAN', 'ORANGE', 'PURPLE'];
    const progressWidth = 120; // Reduced from 130 to prevent right edge clipping
    const progressHeight = 10; // Height of each progress bar
    const progressX = GAME_BORDER_RIGHT + 15; // X position for all UI elements
    let progressY = 170; // Starting Y position (after the headers) - increased from 150 for more spacing
    
    // Get the number of active colors for this level
    const availableColors = getAvailableColorsForLevel(currentLevel);
    
    // Display level difficulty info with improved styling
    ctx.fillStyle = '#FFCC33'; // Gold color for headers
    ctx.font = 'bold 16px "VT323", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${currentLevel} - ${availableColors} COLORS`, GAME_BORDER_RIGHT + PROGRESS_METER_WIDTH/2, 30);
    
    // Add a decorative divider
    ctx.strokeStyle = '#FFCC33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GAME_BORDER_RIGHT + 15, 45);
    ctx.lineTo(GAME_BORDER_RIGHT + PROGRESS_METER_WIDTH - 15, 45);
    ctx.stroke();
    
    // Display a mini-legend for color progression with improved styling
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px "VT323", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('COLOR PROGRESSION', GAME_BORDER_RIGHT + PROGRESS_METER_WIDTH/2, 80);
    
    // Create a color progression legend box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(GAME_BORDER_RIGHT + 15, 90, PROGRESS_METER_WIDTH - 30, 55);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.strokeRect(GAME_BORDER_RIGHT + 15, 90, PROGRESS_METER_WIDTH - 30, 55);
    
    // Level progression text with consistent styling
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '13px "VT323", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('LV 1-2: 4 COLORS', GAME_BORDER_RIGHT + 25, 105);
    ctx.fillText('LV 3-10: 6 COLORS', GAME_BORDER_RIGHT + 25, 120);
    ctx.fillText('LV 11+: 8 COLORS', GAME_BORDER_RIGHT + 25, 135);
    
    // Add a decorative divider before color progress section
    ctx.strokeStyle = '#FFCC33';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GAME_BORDER_RIGHT + 15, progressY - 20); // Adjusted from progressY - 15
    ctx.lineTo(GAME_BORDER_RIGHT + PROGRESS_METER_WIDTH - 15, progressY - 20); // Adjusted from progressY - 15
    ctx.stroke();
    
    // Define consistent measurements for UI alignment
    const circleX = progressX + 15;
    const nameX = circleX + 20;
    const barX = nameX + 55;
    const barWidth = progressWidth - 30;
    const checkmarkX = barX + barWidth + 10;
    
    // Draw each color progress bar with improved organization
    for (let i = 0; i < 8; i++) {
        // Skip inactive colors
        if (i >= availableColors && pegCountsByColor[i] === 0) continue;
        
        // Calculate percentage complete
        const percentage = pegCountsByColor[i] > 0 ? 
            Math.min(1.0, hitPegCountsByColor[i] / pegCountsByColor[i]) : 1.0;
        
        // Calculate threshold position
        const threshold = colorThresholds ? colorThresholds[i] : 0.25;
        
        // Calculate the threshold X position
        const thresholdX = progressX + (threshold * progressWidth);
        
        // Draw color bar with improved layout
        const barY = progressY + (i * 50); // Increased spacing between bars (from 40 to 50)
        
        // If this color is inactive but has pegs, show it dimmed
        const isActive = i < availableColors;
        const opacity = isActive ? 1.0 : 0.5;
        ctx.globalAlpha = opacity;
        
        // Create a background frame for each color section
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(progressX, barY - 15, progressWidth + 20, 45); // Increased height from 35 to 45
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(progressX, barY - 15, progressWidth + 20, 45); // Updated height here too
        
        // Draw color indicator circle with matching color
        ctx.fillStyle = pegColors[i];
        ctx.beginPath();
        ctx.arc(progressX + 12, barY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw color name with consistent position
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px "VT323", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(colorNames[i], progressX + 25, barY + 4);
        
        // Draw completion checkmark for completed colors
        if (percentage >= threshold) {
            ctx.fillStyle = '#FFCC33';
            ctx.font = 'bold 16px "VT323", monospace';
            ctx.fillText('✓', progressX + progressWidth + 10, barY + 4);
        }
        
        // Draw progress bar container
        ctx.fillStyle = '#333333';
        ctx.fillRect(progressX, barY + 10, progressWidth, progressHeight);
        
        // Draw filled portion of progress bar
        ctx.fillStyle = pegColors[i];
        const fillWidth = percentage * progressWidth;
        ctx.fillRect(progressX, barY + 10, fillWidth, progressHeight);
        
        // Draw threshold marker as a vertical line
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(thresholdX, barY + 8);
        ctx.lineTo(thresholdX, barY + progressHeight + 12);
        ctx.stroke();
        
        // Reset alpha
        ctx.globalAlpha = 1.0;
    }
    
    // Display level complete message
    if (levelCompleted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT / 2 - 50, 400, 100);
        ctx.strokeStyle = '#FFCC33';
        ctx.lineWidth = 4;
        ctx.strokeRect(CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT / 2 - 50, 400, 100);
        
        ctx.fillStyle = '#FFCC33';
        ctx.font = '36px "VT323", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL COMPLETE!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.font = '24px "VT323", monospace';
        // Show level-based bonus
        const levelBonus = 500 + (currentLevel * 50);
        ctx.fillText(`Bonus: ${levelBonus} points`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
        ctx.textAlign = 'left';
    }
    
    // If shop is active, draw shop UI instead of regular UI
    if (shopActive) {
        drawShop();
        return;
    }
}

// Override the afterRender event to draw our custom UI elements
Events.on(render, 'afterRender', function() {
    const ctx = render.context;
    
    // Draw animated background
    drawBackground(ctx);
    
    // Draw sidebar background with gradient
    const sidebarGradient = ctx.createLinearGradient(
        GAME_BORDER_RIGHT, 0,
        GAME_BORDER_RIGHT + PROGRESS_METER_WIDTH, CANVAS_HEIGHT
    );
    sidebarGradient.addColorStop(0, '#1A2A3A'); // Darker at left edge
    sidebarGradient.addColorStop(0.5, '#223244'); // Lighter in middle
    sidebarGradient.addColorStop(1, '#1A2A3A'); // Darker at right edge
    
    ctx.fillStyle = sidebarGradient;
    ctx.fillRect(GAME_BORDER_RIGHT, 0, PROGRESS_METER_WIDTH, CANVAS_HEIGHT);
    
    // Add subtle pattern to sidebar background
    ctx.fillStyle = 'rgba(0, 30, 60, 0.1)';
    for (let y = 0; y < CANVAS_HEIGHT; y += 20) {
        ctx.fillRect(GAME_BORDER_RIGHT, y, PROGRESS_METER_WIDTH, 10);
    }
    
    // Draw decorative header on sidebar
    const headerGradient = ctx.createLinearGradient(
        GAME_BORDER_RIGHT, 0,
        GAME_BORDER_RIGHT + PROGRESS_METER_WIDTH, 60
    );
    headerGradient.addColorStop(0, '#4A3000');
    headerGradient.addColorStop(1, '#644200');
    
    ctx.fillStyle = headerGradient;
    ctx.fillRect(GAME_BORDER_RIGHT, 0, PROGRESS_METER_WIDTH, 60);
    
    // Add decorative lines to header
    ctx.strokeStyle = '#FFCC33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(GAME_BORDER_RIGHT, 59);
    ctx.lineTo(GAME_BORDER_RIGHT + PROGRESS_METER_WIDTH, 59);
    ctx.stroke();
    
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GAME_BORDER_RIGHT, 54);
    ctx.lineTo(GAME_BORDER_RIGHT + PROGRESS_METER_WIDTH, 54);
    ctx.stroke();
    
    // Draw a stylish border to separate game area from progress meters
    const borderGradient = ctx.createLinearGradient(
        GAME_BORDER_RIGHT, 0,
        GAME_BORDER_RIGHT + 5, 0
    );
    borderGradient.addColorStop(0, '#663300');
    borderGradient.addColorStop(1, '#442200');
    
    ctx.fillStyle = borderGradient;
    ctx.fillRect(GAME_BORDER_RIGHT, 0, 5, CANVAS_HEIGHT);
    
    // Add highlight line to border
    ctx.strokeStyle = 'rgba(255, 204, 51, 0.5)'; // Semi-transparent gold
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(GAME_BORDER_RIGHT, 0);
    ctx.lineTo(GAME_BORDER_RIGHT, CANVAS_HEIGHT);
    ctx.stroke();
    
    // Custom rendering for pegs - draw directly on canvas with 3D effect
    const bodies = Composite.allBodies(world);
    
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        
        // Custom launcher rendering
        if (body.label === 'launcher_base') {
            // Save canvas state
            ctx.save();
            
            // Create a radial gradient for 3D effect
            const gradient = ctx.createRadialGradient(
                body.position.x - 10, // x0 - highlight offset to upper left
                body.position.y - 10, // y0 - highlight offset to upper left
                5, // r0 - small inner radius for highlight 
                body.position.x, // x1 - center of launcher
                body.position.y, // y1 - center of launcher
                30  // r1 - launcher radius
            );
            
            // Add gradient color stops for 3D effect
            gradient.addColorStop(0, '#FF9933'); // Light orange
            gradient.addColorStop(0.4, '#FF6600'); // Original orange
            gradient.addColorStop(1, '#CC5500'); // Dark orange
            
            // Draw launcher with gradient
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, 30, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Add a small white highlight circle for that classic 2000's "bubble" look
            ctx.beginPath();
            ctx.arc(
                body.position.x - 10,
                body.position.y - 10,
                8,
                0, 2 * Math.PI
            );
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.fill();
            
            // Draw stroke
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, 30, 0, 2 * Math.PI);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Add a slight shadow effect
            ctx.beginPath();
            ctx.arc(body.position.x + 2, body.position.y + 2, 30, 0, 2 * Math.PI);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Restore canvas state
            ctx.restore();
        }
        
        // Custom peg rendering (existing code)
        if (body.label === 'peg') {
            // Save canvas state
            ctx.save();
            
            // Get base color - either original or gray if hit
            const pegColor = !body.isHit ? body.originalColor : '#999999';
            
            // Create distorted/glitched appearance for Cruelty Squad aesthetic
            const isHit = body.isHit;
            const timestamp = Date.now();
            // Use a combination of position and color group as a stable identifier
            const pegIdentifier = body.position.x * 31 + body.position.y + (body.colorGroup || 0) * 1000;
            
            // Use the animation offset if it exists, or default to 0
            const animOffset = body.animationOffset || 0;
            
            // Define baseHue here so it's available throughout the function
            // Calculate a consistent hue based on the peg's properties rather than array index
            const baseHue = Math.floor((pegIdentifier * 39) % 360);
            
            // Apply digital/glitchy rendering
            ctx.translate(body.position.x, body.position.y);
            
            // COMPLETELY NEW IMPLEMENTATION OF PEG RENDERING
            
            // Draw solid base color first for better distinction
            if (!isHit) {
                ctx.beginPath();
                ctx.arc(0, 0, PEG_RADIUS * 0.9, 0, Math.PI * 2);
                ctx.fillStyle = pegColor;
                ctx.fill();
            }
            
            // Create color pattern for this peg based on color group
            let colorBase, colorBright, colorDark;
            switch (body.colorGroup) {
                case 0: // Red
                    colorBase = 'rgb(220, 0, 0)';
                    colorBright = 'rgba(255, 50, 50, 0.8)';
                    colorDark = 'rgb(150, 0, 0)';
                    break;
                case 1: // Blue
                    colorBase = 'rgb(0, 0, 220)';
                    colorBright = 'rgba(50, 50, 255, 0.8)';
                    colorDark = 'rgb(0, 0, 150)';
                    break;
                case 2: // Yellow
                    colorBase = 'rgb(220, 220, 0)';
                    colorBright = 'rgba(255, 255, 50, 0.8)';
                    colorDark = 'rgb(150, 150, 0)';
                    break;
                case 3: // Green
                    colorBase = 'rgb(0, 220, 0)';
                    colorBright = 'rgba(50, 255, 50, 0.8)';
                    colorDark = 'rgb(0, 150, 0)';
                    break;
                case 4: // Magenta
                    colorBase = 'rgb(220, 0, 220)';
                    colorBright = 'rgba(255, 50, 255, 0.8)';
                    colorDark = 'rgb(150, 0, 150)';
                    break;
                case 5: // Cyan
                    colorBase = 'rgb(0, 220, 220)';
                    colorBright = 'rgba(50, 255, 255, 0.8)';
                    colorDark = 'rgb(0, 150, 150)';
                    break;
                case 6: // Orange
                    colorBase = 'rgb(220, 120, 0)';
                    colorBright = 'rgba(255, 150, 50, 0.8)';
                    colorDark = 'rgb(150, 80, 0)';
                    break;
                case 7: // Purple
                    colorBase = 'rgb(120, 0, 220)';
                    colorBright = 'rgba(150, 50, 255, 0.8)';
                    colorDark = 'rgb(80, 0, 150)';
                    break;
                default: // Fallback to red if color group is invalid
                    colorBase = 'rgb(220, 0, 0)';
                    colorBright = 'rgba(255, 50, 50, 0.8)';
                    colorDark = 'rgb(150, 0, 0)';
            }
            
            // Create pulsing glitch effect based on time and peg identifier
            // Add the animation offset to create staggered animations
            const pulseRate = 0.001;  // Speed of pulse animation
            const pulseAmount = 0.2;  // How much the effect pulses
            const pulseOffset = Math.sin((timestamp + animOffset) * pulseRate + pegIdentifier * 0.1);
            const pulseFactor = 1.0 + pulseOffset * pulseAmount;
            
            // Create outer gradient with glitch pulse effect
            if (!isHit) {
                // Create an outer pulsing gradient that's more like a glow or halo
                const outerGlow = ctx.createRadialGradient(
                    0, 0, PEG_RADIUS * 0.7,
                    0, 0, PEG_RADIUS * 1.1 * pulseFactor
                );
                
                outerGlow.addColorStop(0, colorBright);
                outerGlow.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
                
                ctx.globalCompositeOperation = 'lighten';
                ctx.beginPath();
                ctx.arc(0, 0, PEG_RADIUS * 1.1 * pulseFactor, 0, Math.PI * 2);
                ctx.fillStyle = outerGlow;
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';
            }
            
            // Draw main peg body with gradient
            const gradient = ctx.createRadialGradient(
                -PEG_RADIUS * 0.3, -PEG_RADIUS * 0.3, PEG_RADIUS * 0.1,
                0, 0, PEG_RADIUS
            );
            
            if (!isHit) {
                // Remove white highlight from gradient
                gradient.addColorStop(0, colorBright);
                gradient.addColorStop(0.5, colorBase);
                gradient.addColorStop(1, colorDark);
            } else {
                // Gray with digital noise for hit pegs
                gradient.addColorStop(0, 'rgba(180, 180, 180, 0.7)');
                gradient.addColorStop(0.4, 'rgba(150, 150, 150, 0.7)');
                gradient.addColorStop(0.7, 'rgba(120, 120, 120, 0.7)');
                gradient.addColorStop(1, 'rgba(80, 80, 80, 0.7)');
            }
            
            ctx.beginPath();
            ctx.arc(0, 0, PEG_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Add circular glitch arcs instead of lines or rectangles
            if (!isHit) {
                ctx.save();
                ctx.globalCompositeOperation = 'overlay';
                
                // Number of arcs varies slightly based on peg identifier for variety
                const arcCount = 2 + Math.floor(Math.abs(Math.sin(pegIdentifier * 0.7)) * 3);
                
                for (let i = 0; i < arcCount; i++) {
                    // Each arc starts at a different angle with slight animation
                    // Apply animation offset to create staggered animations
                    const arcStart = (i / arcCount) * Math.PI * 2 + 
                                    Math.sin((timestamp + animOffset) * 0.0015 + pegIdentifier * 0.2) * 0.5;
                    // Arc length varies with time
                    const arcLength = (0.3 + Math.sin((timestamp + animOffset) * 0.002 + i) * 0.15) * Math.PI;
                    
                    // Radius for this arc
                    const arcRadius = PEG_RADIUS * (0.5 + Math.sin((timestamp + animOffset) * 0.001 + i + pegIdentifier * 0.1) * 0.2);
                    
                    // Draw the arc
                    ctx.beginPath();
                    ctx.arc(0, 0, arcRadius, arcStart, arcStart + arcLength);
                    
                    // Color based on peg color group
                    const arcAlpha = 0.3 + Math.sin((timestamp + animOffset) * 0.002 + i) * 0.1;
                    ctx.strokeStyle = isHit ? `rgba(200, 200, 200, ${arcAlpha})` : colorBright;
                    ctx.lineWidth = 2 + Math.sin((timestamp + animOffset) * 0.002 + i + pegIdentifier * 0.05) * 1;
                    ctx.stroke();
                }
                
                ctx.restore();
            }
            
            // Add digital "scan line" effect - horizontal lines that move across the peg
            if (!isHit) {
                ctx.save();
                ctx.globalCompositeOperation = 'overlay';
                
                const scanLineCount = 3;
                
                for (let i = 0; i < scanLineCount; i++) {
                    // Make scan lines move up and down over time
                    // Apply animation offset for staggered movement
                    const scanY = -PEG_RADIUS + ((((timestamp + animOffset) * 0.05) + (i * 200)) % (PEG_RADIUS * 4)) - PEG_RADIUS;
                    
                    // Scan line alpha pulses with time
                    const scanAlpha = 0.2 + Math.sin((timestamp + animOffset) * 0.001 + i * 0.5) * 0.1;
                    
                    // Only draw scan lines if they're within the peg
                    if (Math.abs(scanY) <= PEG_RADIUS) {
                        ctx.beginPath();
                        
                        // Calculate how wide the scan line should be at this Y position
                        // (creates the circular mask effect)
                        const lineWidth = 2 * Math.sqrt(PEG_RADIUS * PEG_RADIUS - scanY * scanY);
                        
                        ctx.moveTo(-lineWidth/2, scanY);
                        ctx.lineTo(lineWidth/2, scanY);
                        ctx.strokeStyle = `rgba(220, 220, 220, ${scanAlpha})`;
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }
                }
                
                ctx.restore();
            }
            
            // Remove the Y2K/early 2000s web style highlight reflection
            
            // Add a clean, bright outline
            ctx.beginPath();
            ctx.arc(0, 0, PEG_RADIUS, 0, Math.PI * 2);
            
            if (!isHit) {
                // Use color-specific outlines with higher contrast
                switch (body.colorGroup) {
                    case 0: // Red
                        ctx.strokeStyle = 'rgb(255, 0, 0)';
                        break;
                    case 1: // Blue
                        ctx.strokeStyle = 'rgb(0, 0, 255)';
                        break;
                    case 2: // Yellow
                        ctx.strokeStyle = 'rgb(255, 255, 0)';
                        break;
                    case 3: // Green
                        ctx.strokeStyle = 'rgb(0, 255, 0)';
                        break;
                    case 4: // Magenta
                        ctx.strokeStyle = 'rgb(255, 0, 255)';
                        break;
                    case 5: // Cyan
                        ctx.strokeStyle = 'rgb(0, 255, 255)';
                        break;
                    case 6: // Orange
                        ctx.strokeStyle = 'rgb(255, 165, 0)';
                        break;
                    case 7: // Purple
                        ctx.strokeStyle = 'rgb(160, 32, 240)';
                        break;
                    default:
                        ctx.strokeStyle = `hsl(${baseHue}, 100%, 50%)`;
                }
            } else {
                ctx.strokeStyle = '#666666';
            }
            
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Restore canvas state
            ctx.restore();
        }
        
        // Custom ball rendering for metallic look
        if (body.label === 'ball') {
            // Save canvas state
            ctx.save();
            
            try {
                // Initialize 3D rotation properties if they don't exist
                if (!body.rotation) {
                    body.rotation = {
                        x: Math.random() * Math.PI * 2, // Random initial x-axis rotation
                        y: Math.random() * Math.PI * 2, // Random initial y-axis rotation
                        z: body.spinAngle || 0, // Use existing spin angle as z-axis rotation
                        vx: 0.01 + Math.random() * 0.02, // Reduced x-axis rotation speed
                        vy: 0.01 + Math.random() * 0.02, // Reduced y-axis rotation speed
                        vz: 0.02 + Math.random() * 0.03, // Reduced z-axis rotation speed
                        lastVelocity: body.velocity ? { x: body.velocity.x, y: body.velocity.y } : { x: 0, y: 0 },
                        // Add wobble effect properties
                        wobbleAmplitude: { x: 0, y: 0, z: 0 },
                        wobbleFrequency: { x: 0, y: 0, z: 0 },
                        wobblePhase: { x: 0, y: 0, z: 0 },
                        wobbleDamping: 0.95,
                        lastCollision: 0
                    };
                }
                
                // Update rotation angles based on 3D physics
                if (body.velocity) {
                    try {
                        // Calculate change in velocity since last frame
                        const dvx = body.velocity.x - (body.rotation.lastVelocity?.x || 0);
                        const dvy = body.velocity.y - (body.rotation.lastVelocity?.y || 0);
                        
                        // Check for collision (significant velocity change)
                        const deltaVMagnitude = Math.sqrt(dvx * dvx + dvy * dvy);
                        const currentTime = Date.now();
                        
                        if (deltaVMagnitude > 3.0 && currentTime - body.rotation.lastCollision > 100) {
                            // Add wobble effect on collision
                            body.rotation.wobbleAmplitude.x = 0.08 * Math.min(1.0, deltaVMagnitude / 10);
                            body.rotation.wobbleAmplitude.y = 0.07 * Math.min(1.0, deltaVMagnitude / 10);
                            body.rotation.wobbleAmplitude.z = 0.05 * Math.min(1.0, deltaVMagnitude / 10);
                            
                            // Set random frequencies and phases
                            body.rotation.wobbleFrequency.x = 0.2 + Math.random() * 0.1;
                            body.rotation.wobbleFrequency.y = 0.2 + Math.random() * 0.1;
                            body.rotation.wobbleFrequency.z = 0.2 + Math.random() * 0.1;
                            
                            body.rotation.wobblePhase.x = Math.random() * Math.PI * 2;
                            body.rotation.wobblePhase.y = Math.random() * Math.PI * 2;
                            body.rotation.wobblePhase.z = Math.random() * Math.PI * 2;
                            
                            body.rotation.lastCollision = currentTime;
                        }
                        
                        // Limit extreme values to prevent rendering issues
                        const maxDelta = 5.0;
                        const boundedDvx = Math.max(-maxDelta, Math.min(maxDelta, dvx));
                        const boundedDvy = Math.max(-maxDelta, Math.min(maxDelta, dvy));
                        
                        // More responsive rotation based on velocity changes
                        body.rotation.vx += boundedDvy * 0.008; // Increased from 0.005
                        body.rotation.vy -= boundedDvx * 0.008; // Increased from 0.005
                        
                        // Add velocity-dependent spin to z-axis
                        const speedMagnitude = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
                        body.rotation.vz += Math.sign(body.velocity.x) * 0.001 * speedMagnitude;
                        
                        // Limit rotation velocities to prevent extreme values
                        const maxRotationVel = 0.15; // Increased from 0.1
                        body.rotation.vx = Math.max(-maxRotationVel, Math.min(maxRotationVel, body.rotation.vx));
                        body.rotation.vy = Math.max(-maxRotationVel, Math.min(maxRotationVel, body.rotation.vy));
                        body.rotation.vz = Math.max(-maxRotationVel, Math.min(maxRotationVel, body.rotation.vz));
                        
                        // Store current velocity for next frame
                        body.rotation.lastVelocity = { 
                            x: body.velocity.x, 
                            y: body.velocity.y 
                        };
                        
                        // Adjust rotation speed based on overall velocity (faster ball spins faster)
                        const speed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y) / 10;
                        const speedFactor = 0.35 + Math.min(speed, 2.0); // Increased from 0.25 + min(speed, 1.5)
                        
                        // Update rotation angles - now with wobble
                        const time = Date.now() / 1000; // Time in seconds
                        
                        // Calculate wobble effects
                        const wobbleX = body.rotation.wobbleAmplitude.x * 
                            Math.sin(time * body.rotation.wobbleFrequency.x + body.rotation.wobblePhase.x);
                        const wobbleY = body.rotation.wobbleAmplitude.y * 
                            Math.sin(time * body.rotation.wobbleFrequency.y + body.rotation.wobblePhase.y);
                        const wobbleZ = body.rotation.wobbleAmplitude.z * 
                            Math.sin(time * body.rotation.wobbleFrequency.z + body.rotation.wobblePhase.z);
                        
                        // Apply rotations with wobble
                        body.rotation.x += (body.rotation.vx * speedFactor) + wobbleX;
                        body.rotation.y += (body.rotation.vy * speedFactor) + wobbleY;
                        body.rotation.z += (body.rotation.vz * speedFactor * Math.sign(body.velocity.x)) + wobbleZ;
                        
                        // Dampen wobble amplitudes
                        body.rotation.wobbleAmplitude.x *= body.rotation.wobbleDamping;
                        body.rotation.wobbleAmplitude.y *= body.rotation.wobbleDamping;
                        body.rotation.wobbleAmplitude.z *= body.rotation.wobbleDamping;
                        
                        // If wobble is very small, zero it out
                        if (body.rotation.wobbleAmplitude.x < 0.001) body.rotation.wobbleAmplitude.x = 0;
                        if (body.rotation.wobbleAmplitude.y < 0.001) body.rotation.wobbleAmplitude.y = 0;
                        if (body.rotation.wobbleAmplitude.z < 0.001) body.rotation.wobbleAmplitude.z = 0;
                        
                    } catch (e) {
                        // Fallback to simple rotation if there's an error
                        body.rotation.x += 0.01;
                        body.rotation.y += 0.015;
                        body.rotation.z += 0.02;
                        console.error("Error in ball rotation physics:", e);
                    }
                } else {
                    // Simple rotation if no velocity, with wobble decay
                    const time = Date.now() / 1000; // Time in seconds
                    
                    // Calculate wobble effects
                    const wobbleX = body.rotation.wobbleAmplitude.x * 
                        Math.sin(time * body.rotation.wobbleFrequency.x + body.rotation.wobblePhase.x);
                    const wobbleY = body.rotation.wobbleAmplitude.y * 
                        Math.sin(time * body.rotation.wobbleFrequency.y + body.rotation.wobblePhase.y);
                    const wobbleZ = body.rotation.wobbleAmplitude.z * 
                        Math.sin(time * body.rotation.wobbleFrequency.z + body.rotation.wobblePhase.z);
                    
                    body.rotation.x += (body.rotation.vx * 0.5) + wobbleX; // Added dampening factor
                    body.rotation.y += (body.rotation.vy * 0.5) + wobbleY; // Added dampening factor
                    body.rotation.z += (body.rotation.vz * 0.5) + wobbleZ; // Added dampening factor
                    
                    // Dampen wobble amplitudes faster when not moving
                    body.rotation.wobbleAmplitude.x *= body.rotation.wobbleDamping * 0.98;
                    body.rotation.wobbleAmplitude.y *= body.rotation.wobbleDamping * 0.98;
                    body.rotation.wobbleAmplitude.z *= body.rotation.wobbleDamping * 0.98;
                    
                    // If wobble is very small, zero it out
                    if (body.rotation.wobbleAmplitude.x < 0.001) body.rotation.wobbleAmplitude.x = 0;
                    if (body.rotation.wobbleAmplitude.y < 0.001) body.rotation.wobbleAmplitude.y = 0;
                    if (body.rotation.wobbleAmplitude.z < 0.001) body.rotation.wobbleAmplitude.z = 0;
                }
                
                // Normalize angles
                body.rotation.x = body.rotation.x % (Math.PI * 2);
                body.rotation.y = body.rotation.y % (Math.PI * 2);
                body.rotation.z = body.rotation.z % (Math.PI * 2);
                
                // Create vectors for 3D mapping (simplified 3D projection)
                const sinX = Math.sin(body.rotation.x);
                const cosX = Math.cos(body.rotation.x);
                const sinY = Math.sin(body.rotation.y);
                const cosY = Math.cos(body.rotation.y);
                const sinZ = Math.sin(body.rotation.z);
                const cosZ = Math.cos(body.rotation.z);
                
                // Enhanced highlight position calculation
                const highlightVector = {
                    x: 0.7 * cosY * cosZ - 0.35 * sinY, // Increased from 0.6/0.3
                    y: 0.7 * sinX * sinY * cosZ + 0.7 * cosX * sinZ - 0.35 * sinX * cosY // Increased from 0.6/0.3
                };
                
                // Enhanced secondary highlight position
                const secondaryVector = {
                    x: -0.5 * cosY * cosZ + 0.25 * sinY, // Increased from 0.4/0.2
                    y: -0.5 * sinX * sinY * cosZ - 0.5 * cosX * sinZ + 0.25 * sinX * cosY // Increased from 0.4/0.2
                };
                
                // Enhanced reflection strip direction
                const stripVector = {
                    x: 1.2 * cosY * sinZ, // Increased from 1.0
                    y: -1.2 * sinX * sinY * sinZ + 1.2 * cosX * cosZ // Increased from 1.0
                };
                
                // Calculate 3D lighting vector (from top-right)
                const lightVector = {
                    x: 0.5, y: -0.5, z: 0.7
                };
                
                // Normalize light vector
                const lightMagnitude = Math.sqrt(
                    lightVector.x * lightVector.x + 
                    lightVector.y * lightVector.y + 
                    lightVector.z * lightVector.z
                );
                
                const normalizedLight = {
                    x: lightVector.x / lightMagnitude,
                    y: lightVector.y / lightMagnitude,
                    z: lightVector.z / lightMagnitude
                };
                
                // Calculate surface normal at highlight point based on rotation
                const highlightNormal = {
                    x: highlightVector.x, 
                    y: highlightVector.y,
                    z: Math.sqrt(1 - highlightVector.x * highlightVector.x - highlightVector.y * highlightVector.y)
                };
                
                // Calculate light intensity at highlight point (dot product)
                const highlightDot = 
                    highlightNormal.x * normalizedLight.x + 
                    highlightNormal.y * normalizedLight.y + 
                    highlightNormal.z * normalizedLight.z;
                
                // Calculate enhanced light intensity with specular highlight
                const diffuseFactor = Math.max(0.3, highlightDot); // Stronger diffuse lighting
                const specularFactor = Math.pow(Math.max(0, highlightDot), 8) * 0.8; // Added specular highlight
                
                // Draw ball with enhanced metallic gradient
                const gradient = ctx.createRadialGradient(
                    body.position.x + BALL_RADIUS * highlightVector.x, 
                    body.position.y + BALL_RADIUS * highlightVector.y,
                    BALL_RADIUS * 0.05, // Smaller highlight center
                    body.position.x,
                    body.position.y,
                    BALL_RADIUS * 1.2
                );
                
                // Calculate color intensity based on lighting
                const baseIntensity = Math.min(255, Math.round(220 * diffuseFactor + 35 * specularFactor));
                const midIntensity = Math.min(255, Math.round(180 * diffuseFactor + 20 * specularFactor));
                const lowIntensity = Math.min(255, Math.round(120 * diffuseFactor + 10 * specularFactor));
                const darkIntensity = Math.min(255, Math.round(80 * diffuseFactor));
                
                // Enhanced metallic gradient - using silver/chrome colors
                gradient.addColorStop(0, `rgb(${baseIntensity}, ${baseIntensity}, ${Math.min(255, baseIntensity + 5)})`); // Slight blue tint for chrome
                gradient.addColorStop(0.15, `rgb(${Math.round(baseIntensity * 0.98)}, ${Math.round(baseIntensity * 0.98)}, ${Math.round(baseIntensity)})`);
                gradient.addColorStop(0.3, `rgb(${midIntensity}, ${midIntensity}, ${Math.min(255, midIntensity + 3)})`);
                gradient.addColorStop(0.5, `rgb(${lowIntensity}, ${lowIntensity}, ${lowIntensity})`);
                gradient.addColorStop(0.7, `rgb(${Math.round(lowIntensity * 0.75)}, ${Math.round(lowIntensity * 0.75)}, ${Math.round(lowIntensity * 0.8)})`);
                gradient.addColorStop(0.85, `rgb(${Math.round(lowIntensity * 0.6)}, ${Math.round(lowIntensity * 0.6)}, ${Math.round(lowIntensity * 0.65)})`);
                gradient.addColorStop(1, `rgb(${darkIntensity}, ${darkIntensity}, ${Math.round(darkIntensity * 1.05)})`);
                
                // Draw ball with enhanced metallic gradient
                ctx.beginPath();
                ctx.arc(body.position.x, body.position.y, BALL_RADIUS, 0, 2 * Math.PI);
                ctx.fillStyle = gradient;
                ctx.fill();
                
                // Add enhanced texture mapping simulation (latitude/longitude grid)
                ctx.save();
                ctx.beginPath();
                ctx.arc(body.position.x, body.position.y, BALL_RADIUS, 0, 2 * Math.PI);
                ctx.clip();
                
                // Replace pearlescent layer with more subtle metallic sheen
                const metallicSheen = ctx.createRadialGradient(
                    body.position.x + BALL_RADIUS * 0.25 * highlightVector.x, // Offset center by rotation
                    body.position.y + BALL_RADIUS * 0.25 * highlightVector.y, // Offset center by rotation
                    0,
                    body.position.x, 
                    body.position.y,
                    BALL_RADIUS * 1.2 // Slightly larger for better coverage
                );
                
                // Create metallic sheen effect with subtle bluish tint
                metallicSheen.addColorStop(0, `rgba(220, 225, 235, ${0.15 + specularFactor * 0.2})`); // Subtle blue-tinted white
                metallicSheen.addColorStop(0.4, `rgba(200, 205, 215, ${0.1 + specularFactor * 0.15})`); // Light steel blue tint
                metallicSheen.addColorStop(0.7, `rgba(180, 185, 195, ${0.05 + specularFactor * 0.1})`); // Darker steel blue tint
                metallicSheen.addColorStop(1, `rgba(150, 155, 165, 0)`); // Fade out
                
                // Fill with metallic sheen
                ctx.fillStyle = metallicSheen;
                ctx.fill();
                
                // Draw enhanced latitude lines (equator is more pronounced)
                const latitudeCount = 6; // More latitude lines (was 5)
                
                // Draw each latitude line
                for (let i = 0; i < latitudeCount; i++) {
                    const latitude = (i + 1) / (latitudeCount + 1) * Math.PI;
                    const radiusAtLatitude = Math.sin(latitude) * BALL_RADIUS;
                    const yOffset = Math.cos(latitude) * BALL_RADIUS;
                    
                    // Apply enhanced 3D rotation to latitude circles
                    const latY = body.position.y + yOffset * cosX - radiusAtLatitude * sinX * sinY;
                    
                    // Calculate whether this latitude is on the front-facing hemisphere
                    // A latitude is front-facing if its normal vector (0,yOffset/BALL_RADIUS,0) has positive dot product with view vector (0,0,1)
                    // After rotation, we check if the y-component of the normal is pointing toward or away from viewer
                    const normalY = cosX * (yOffset/BALL_RADIUS) - sinX * sinY * 0;
                    const isFrontFacing = normalY <= 0; // Visible if normal is pointing toward viewer (negative y in screen space)
                    
                    // Only draw latitudes on the front-facing hemisphere
                    if (isFrontFacing && Math.abs(yOffset) < BALL_RADIUS * 0.95) {
                        // Enhanced perspective for latitude circles
                        const xRadius = Math.max(0.1, radiusAtLatitude * cosY);
                        const yRadius = Math.max(0.1, radiusAtLatitude * (Math.abs(sinY) * 0.4 + 0.6)); // Enhanced perspective squeeze
                        
                        // Calculate opacity based on position relative to light
                        const latitudeFactor = i / (latitudeCount - 1); // 0 to 1
                        const isEquator = Math.abs(latitudeFactor - 0.5) < 0.15;
                        const latitudeOpacity = isEquator ? 0.2 : 0.12; // More subtle lines for metallic look
                        
                        ctx.beginPath();
                        ctx.ellipse(
                            body.position.x,
                            latY,
                            xRadius, // x-radius with enhanced y-axis rotation
                            yRadius, // Enhanced perspective
                            0,
                            0,
                            Math.PI * 2
                        );
                        
                        // More subtle lines for metallic look
                        ctx.strokeStyle = `rgba(190, 195, 210, ${latitudeOpacity})`;
                        ctx.lineWidth = isEquator ? 1.2 : 0.8; // Thinner lines
                        ctx.stroke();
                    }
                }
                
                // Draw enhanced longitude lines with better perspective - more subtle for metallic look
                const longitudeCount = 8; // More longitude lines (was 5)
                for (let i = 0; i < longitudeCount; i++) {
                    const longitude = i * Math.PI / longitudeCount;
                    const adjustedLongitude = longitude + body.rotation.z;
                    
                    // Improved visibility check for longitude
                    // A longitude is partly visible if any portion is front-facing
                    // For a longitude at angle phi, the normal at equator is (cos(phi), 0, sin(phi))
                    // After rotation by y axis, we check if z-component is positive (toward viewer)
                    const normalX = Math.cos(adjustedLongitude);
                    const normalZ = Math.sin(adjustedLongitude);
                    const rotatedNormalZ = normalX * sinY + normalZ * cosY;
                    
                    // Only draw if this longitude has any part that would be visible from viewer
                    if (rotatedNormalZ > -0.1) { // Slightly negative threshold to avoid popping
                        // Calculate visibility factor based on how front-facing this longitude is
                        const visibilityFactor = (rotatedNormalZ + 0.1) / 1.1; // Scale to 0-1 range
                        const opacity = Math.max(0.05, Math.min(0.2, visibilityFactor * 0.2)); // Lower opacity for more subtle lines
                        
                        ctx.beginPath();
                        
                        // Track whether we're currently drawing a visible portion
                        let isDrawing = false;
                        let lastVisibleX = 0, lastVisibleY = 0;
                        
                        // Draw longitude arc with more points for smoother curve, checking visibility of each point
                        for (let t = 0; t <= 1; t += 0.02) { // More points (was 0.05)
                            const lat = t * Math.PI;
                            const x = Math.sin(lat) * Math.cos(adjustedLongitude);
                            const y = Math.cos(lat);
                            const z = Math.sin(lat) * Math.sin(adjustedLongitude);
                            
                            // Apply enhanced 3D rotation with stronger perspective
                            const perspectiveFactor = 1.1; // Stronger perspective deformation (was implicitly 1.0)
                            const rotX = x * cosY + z * sinY * perspectiveFactor;
                            const rotY = y * cosX - (x * sinY - z * cosY) * sinX * perspectiveFactor;
                            const rotZ = z * cosY - x * sinY; // Calculate rotated Z to check visibility
                            
                            const screenX = body.position.x + rotX * BALL_RADIUS;
                            const screenY = body.position.y + rotY * BALL_RADIUS;
                            
                            // Check if this point is on the front-facing hemisphere
                            const pointIsFrontFacing = rotZ >= 0;
                            
                            if (pointIsFrontFacing) {
                                if (!isDrawing) {
                                    // Start a new segment
                                    isDrawing = true;
                                    ctx.moveTo(screenX, screenY);
                                } else {
                                    // Continue current segment
                                    ctx.lineTo(screenX, screenY);
                                }
                                lastVisibleX = screenX;
                                lastVisibleY = screenY;
                            } else if (isDrawing) {
                                // End current segment
                                ctx.lineTo(screenX, screenY);
                                isDrawing = false;
                            }
                        }
                        
                        // Thinner lines for metallic look
                        const lineWidth = visibilityFactor * 0.5 + 0.5; // 0.5 to 1.0 (thinner)
                        
                        ctx.strokeStyle = `rgba(180, 185, 200, ${opacity})`;
                        ctx.lineWidth = lineWidth;
                        ctx.stroke();
                    }
                }
                
                ctx.restore(); // Restore from texture clipping
                
                // Replace rainbow reflection strip with chrome mirror-like reflection
                ctx.save();
                ctx.beginPath();
                ctx.arc(body.position.x, body.position.y, BALL_RADIUS, 0, 2 * Math.PI);
                ctx.clip();
                
                // Calculate enhanced strip parameters
                const stripWidth = BALL_RADIUS * 0.6; // Wider strip for enhanced effect (was 0.5)
                const stripAngle = Math.atan2(stripVector.y, stripVector.x);
                
                // Apply 3D rotation effect to the strip
                ctx.translate(body.position.x, body.position.y);
                ctx.rotate(stripAngle);
                
                // Enhanced warp strip width for more dramatic 3D curvature
                const stripPerspective = Math.abs(Math.sin(body.rotation.x)) * 0.8 + 0.2; // Enhanced perspective squeeze (was 0.7 + 0.3)
                
                // Create mirror-like reflection gradient for chrome effect
                const mirrorGradient = ctx.createLinearGradient(
                    -BALL_RADIUS, 0,
                    BALL_RADIUS, 0
                );
                
                // Chrome reflection - more silver/white tones with subtle blue hints
                mirrorGradient.addColorStop(0, `rgba(235, 235, 240, 0.7)`); // Almost white with slight blue
                mirrorGradient.addColorStop(0.2, `rgba(210, 215, 225, 0.6)`); // Very light steel blue
                mirrorGradient.addColorStop(0.4, `rgba(180, 185, 200, 0.5)`); // Light steel blue
                mirrorGradient.addColorStop(0.6, `rgba(160, 165, 180, 0.5)`); // Medium steel blue
                mirrorGradient.addColorStop(0.8, `rgba(190, 195, 205, 0.6)`); // Back to lighter steel blue
                mirrorGradient.addColorStop(1, `rgba(220, 225, 235, 0.7)`); // Almost white with slight blue
                
                // Draw warped reflection strip
                ctx.fillStyle = mirrorGradient;
                ctx.beginPath();
                // Ensure all radii are positive to prevent negative radius errors
                const safeRadius = Math.max(0.1, BALL_RADIUS);
                const safePerspective = Math.max(0.1, stripPerspective);
                ctx.ellipse(0, 0, safeRadius, stripWidth * safePerspective, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore(); // Restore from clipping and rotation
                
                // Enhance primary highlight for more chrome-like specular effect
                const primaryAngle = Math.atan2(highlightVector.y, highlightVector.x);
                const primaryGradient = ctx.createRadialGradient(
                    body.position.x + BALL_RADIUS * highlightVector.x,
                    body.position.y + BALL_RADIUS * highlightVector.y,
                    0,
                    body.position.x + BALL_RADIUS * highlightVector.x,
                    body.position.y + BALL_RADIUS * highlightVector.y,
                    Math.max(0.1, BALL_RADIUS * 0.6) // Larger highlight (was 0.5)
                );
                
                // Pure white highlight for chrome effect
                primaryGradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 + specularFactor * 0.1})`); // Pure white, more intense
                primaryGradient.addColorStop(0.3, `rgba(240, 240, 245, ${0.6 + specularFactor * 0.1})`); // Almost white with slight blue
                primaryGradient.addColorStop(0.6, `rgba(220, 225, 235, ${0.3 + specularFactor * 0.1})`); // Light steel blue
                primaryGradient.addColorStop(1, `rgba(200, 205, 220, 0)`); // Fade out
                
                ctx.beginPath();
                // Sharper highlight shape for metallic look
                const highlightWidth = Math.max(0.1, BALL_RADIUS * 0.55); // Slightly smaller for sharper highlight
                const highlightHeight = Math.max(0.1, BALL_RADIUS * 0.4); // Slightly smaller for sharper highlight
                ctx.ellipse(
                    body.position.x + BALL_RADIUS * highlightVector.x,
                    body.position.y + BALL_RADIUS * highlightVector.y,
                    highlightWidth,
                    highlightHeight,
                    primaryAngle + Math.PI/4,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = primaryGradient;
                ctx.fill();
                
                // Add sharper secondary highlight for chrome effect (opposite side)
                const secondaryAngle = Math.atan2(secondaryVector.y, secondaryVector.x);
                const secondaryGradient = ctx.createRadialGradient(
                    body.position.x + BALL_RADIUS * secondaryVector.x,
                    body.position.y + BALL_RADIUS * secondaryVector.y,
                    0,
                    body.position.x + BALL_RADIUS * secondaryVector.x,
                    body.position.y + BALL_RADIUS * secondaryVector.y,
                    Math.max(0.1, BALL_RADIUS * 0.4) // Smaller for sharper highlight
                );
                
                // Steel blue tinted secondary highlight
                secondaryGradient.addColorStop(0, `rgba(210, 215, 225, 0.5)`); // Light steel blue
                secondaryGradient.addColorStop(0.5, `rgba(180, 185, 200, 0.25)`); // Medium steel blue
                secondaryGradient.addColorStop(1, `rgba(150, 155, 170, 0)`); // Fade out
                
                ctx.beginPath();
                ctx.ellipse(
                    body.position.x + BALL_RADIUS * secondaryVector.x,
                    body.position.y + BALL_RADIUS * secondaryVector.y,
                    Math.max(0.1, BALL_RADIUS * 0.45), // Smaller for sharper highlight
                    Math.max(0.1, BALL_RADIUS * 0.3), // Smaller for sharper highlight
                    secondaryAngle + Math.PI/4,
                    0,
                    Math.PI * 2
                );
                ctx.fillStyle = secondaryGradient;
                ctx.fill();
                
                // Add a steel-like reflection at the bottom edge (more subtle)
                ctx.beginPath();
                ctx.ellipse(
                    body.position.x,
                    body.position.y + BALL_RADIUS * 0.8,
                    BALL_RADIUS * 0.5,
                    BALL_RADIUS * 0.15, // Thinner for more metallic look
                    0,
                    0,
                    Math.PI * 2
                );
                
                ctx.fillStyle = `rgba(200, 205, 215, 0.25)`; // Light steel blue, subtle
                ctx.fill();
            } catch (e) {
                // Fallback to simple ball rendering if 3D rendering fails
                console.error("Error in 3D ball rendering:", e);
                ctx.beginPath();
                ctx.arc(body.position.x, body.position.y, BALL_RADIUS, 0, Math.PI * 2);
                
                // Simple silver gradient for fallback
                const fallbackGradient = ctx.createRadialGradient(
                    body.position.x - BALL_RADIUS * 0.3,
                    body.position.y - BALL_RADIUS * 0.3,
                    BALL_RADIUS * 0.1,
                    body.position.x,
                    body.position.y,
                    BALL_RADIUS
                );
                
                fallbackGradient.addColorStop(0, '#FFFFFF');
                fallbackGradient.addColorStop(0.3, '#CCCCCC');
                fallbackGradient.addColorStop(1, '#666666');
                
                ctx.fillStyle = fallbackGradient;
                ctx.fill();
                
                // Simple highlight
                ctx.beginPath();
                ctx.arc(
                    body.position.x - BALL_RADIUS * 0.3,
                    body.position.y - BALL_RADIUS * 0.3,
                    BALL_RADIUS * 0.3,
                    0, Math.PI * 2
                );
                ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                ctx.fill();
            }
            
            // Always ensure there's a clean outline regardless of rendering method
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, BALL_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(40, 40, 40, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Restore canvas state
            ctx.restore();
        }
    }
    
    // Draw aim line when aiming
    if (isAiming) {
        const ctx = render.context;
        ctx.save();
        
        // Make sure global alpha is 1.0 (fully opaque)
        ctx.globalAlpha = 1.0;
        
        // Draw launcher direction indicator (thicker and more visible)
        ctx.beginPath();
        ctx.moveTo(LAUNCHER_X, LAUNCHER_Y);
        ctx.lineTo(
            LAUNCHER_X + Math.cos(aimAngle) * 50,
            LAUNCHER_Y + Math.sin(aimAngle) * 50
        );
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#FF0000';
        ctx.stroke();
        
        // Add an arrow head to make direction clearer
        const arrowX = LAUNCHER_X + Math.cos(aimAngle) * 50;
        const arrowY = LAUNCHER_Y + Math.sin(aimAngle) * 50;
        const arrowSize = 12;
        const arrowAngle = Math.PI / 8;
        
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
            arrowX - arrowSize * Math.cos(aimAngle - arrowAngle),
            arrowY - arrowSize * Math.sin(aimAngle - arrowAngle)
        );
        ctx.lineTo(
            arrowX - arrowSize * Math.cos(aimAngle + arrowAngle),
            arrowY - arrowSize * Math.sin(aimAngle + arrowAngle)
        );
        ctx.closePath();
        ctx.fillStyle = '#FF0000';
        ctx.fill();
        
        // Use the exact same launch position for both the real launch and trajectory prediction
        const launchDistance = 50;
        const launchX = LAUNCHER_X + Math.cos(aimAngle) * launchDistance;
        const launchY = LAUNCHER_Y + Math.sin(aimAngle) * launchDistance;
        
        // Use consistent force magnitude calculations
        const forceMagnitude = aimPower * 0.1;
        const velX = Math.cos(aimAngle) * forceMagnitude * 100;
        const velY = Math.sin(aimAngle) * forceMagnitude * 100;
        
        try {
            // Create a temporary physics world for more accurate simulation
            const tempEngine = Engine.create();
            tempEngine.world.gravity.y = world.gravity.y;
            
            // Add walls to temp world
            const tempWalls = [
                Bodies.rectangle(CANVAS_WIDTH / 2, -30, CANVAS_WIDTH, 60, { isStatic: true }),
                Bodies.rectangle(-30, CANVAS_HEIGHT / 2, 60, CANVAS_HEIGHT, { isStatic: true }),
                Bodies.rectangle(CANVAS_WIDTH + 30, CANVAS_HEIGHT / 2, 60, CANVAS_HEIGHT, { isStatic: true })
            ];
            
            // Add pegs to the temp world
            const tempPegs = [];
            const realPegs = Composite.allBodies(world).filter(body => body.label === 'peg');
            
            for (const peg of realPegs) {
                // Only add non-hit pegs
                if (!peg.isHit) {
                    const tempPeg = Bodies.circle(
                        peg.position.x,
                        peg.position.y,
                        PEG_RADIUS,
                        { 
                            isStatic: true,
                            label: 'temp_peg'
                        }
                    );
                    tempPegs.push(tempPeg);
                }
            }
            
            // Add all bodies to the temp world
            Composite.add(tempEngine.world, [...tempWalls, ...tempPegs]);
            
            // Create a ball for simulation
            const tempBall = Bodies.circle(
                launchX,
                launchY,
                BALL_RADIUS,
                {
                    restitution: 0.8,
                    friction: 0.001,
                    frictionAir: 0.0005,
                    label: 'temp_ball'
                }
            );
            
            // Apply velocity
            Body.setVelocity(tempBall, {
                x: velX,
                y: velY
            });
            
            Composite.add(tempEngine.world, tempBall);
            
            // Add collision detection to the temporary engine
            let collisionDetected = false;
            let collisionPoint = null;
            let hitPegColor = null;
            
            Events.on(tempEngine, 'collisionStart', function(event) {
                const pairs = event.pairs;
                
                for (let i = 0; i < pairs.length; i++) {
                    const pair = pairs[i];
                    
                    // Check if it's a collision between ball and peg
                    if ((pair.bodyA.label === 'temp_ball' && pair.bodyB.label === 'temp_peg') ||
                        (pair.bodyA.label === 'temp_peg' && pair.bodyB.label === 'temp_ball')) {
                        
                        // This stops the simulation when a collision is detected
                        collisionDetected = true;
                        
                        // Save the collision point (ball position at collision)
                        const ball = pair.bodyA.label === 'temp_ball' ? pair.bodyA : pair.bodyB;
                        const peg = pair.bodyA.label === 'temp_peg' ? pair.bodyA : pair.bodyB;
                        
                        collisionPoint = { x: ball.position.x, y: ball.position.y };
                        
                        // Find the real peg that matches this position to get its color
                        const realPeg = realPegs.find(rp => 
                            Math.abs(rp.position.x - peg.position.x) < 1 && 
                            Math.abs(rp.position.y - peg.position.y) < 1
                        );
                        
                        if (realPeg) {
                            hitPegColor = realPeg.originalColor;
                        }
                    }
                }
            });
            
            // Simulate physics and collect points up to collision or 30 frames
            const physicsPoints = [];
            physicsPoints.push({ x: tempBall.position.x, y: tempBall.position.y });
            
            for (let i = 0; i < 30 && !collisionDetected; i++) {
                Engine.update(tempEngine, 16); // ~60fps
                
                physicsPoints.push({ 
                    x: tempBall.position.x, 
                    y: tempBall.position.y 
                });
                
                // Break if ball goes off screen
                if (tempBall.position.y > CANVAS_HEIGHT || 
                    tempBall.position.x < 0 || 
                    tempBall.position.x > CANVAS_WIDTH) {
                    break;
                }
            }
            
            // If collision was detected, add the collision point to ensure the line reaches it
            if (collisionDetected && collisionPoint) {
                physicsPoints.push(collisionPoint);
            }
            
            // Draw physics-based trajectory (in a different color)
            ctx.beginPath();
            ctx.setLineDash([8, 4]); // Different dotted pattern
            ctx.moveTo(physicsPoints[0].x, physicsPoints[0].y);
            
            for (let i = 1; i < physicsPoints.length; i++) {
                ctx.lineTo(physicsPoints[i].x, physicsPoints[i].y);
            }
            
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.7)'; // Cyan for physics simulation
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw a small dot at collision point if detected
            if (collisionDetected && collisionPoint) {
                ctx.beginPath();
                ctx.arc(collisionPoint.x, collisionPoint.y, 5, 0, Math.PI * 2);
                // Use the color of the hit peg, or yellow as fallback
                ctx.fillStyle = hitPegColor || 'rgba(255, 255, 0, 0.7)';
                ctx.fill();
                
                // Add a small glow effect to make it stand out
                ctx.shadowColor = hitPegColor || 'rgba(255, 255, 0, 0.7)';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(collisionPoint.x, collisionPoint.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            
            // Clean up event listeners to prevent memory leaks
            Events.off(tempEngine);
            
        } catch (e) {
            // Fallback to basic trajectory if physics fails
            console.error("Physics simulation error:", e);
            
            // Simple trajectory prediction without collisions
            const gravity = world.gravity.y;
            let posX = launchX;
            let posY = launchY;
            let currVelX = velX;
            let currVelY = velY;
            
            // Generate basic trajectory points
            const simplePoints = [];
            
            for (let i = 0; i < 60; i++) {
                // Update position and velocity
                posX += currVelX * 0.016; // Approx 60fps
                posY += currVelY * 0.016;
                currVelY += gravity * 0.016;
                
                simplePoints.push({ x: posX, y: posY });
                
                // Break if predicted to go off-screen
                if (posY > CANVAS_HEIGHT || posX < 0 || posX > CANVAS_WIDTH) {
                    break;
                }
            }
            
            // Draw a basic trajectory line
            ctx.beginPath();
            ctx.setLineDash([5, 5]); // Dotted line
            ctx.moveTo(launchX, launchY);
            
            for (const point of simplePoints) {
                ctx.lineTo(point.x, point.y);
            }
            
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Draw dots along the trajectory
            for (let i = 0; i < simplePoints.length; i += 4) {
                ctx.beginPath();
                ctx.arc(simplePoints[i].x, simplePoints[i].y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
    
    // Add custom bucket rendering
    for (let i = 0; i < bodies.length; i++) {
        const body = bodies[i];
        
        if (body.label === 'bucket') {
            // Save canvas state
            ctx.save();
            
            // Define the bucket shape for custom rendering
            const vertices = body.vertices;
            
            // Create a gradient for 3D effect - using blues instead of yellows
            const grd = ctx.createLinearGradient(
                body.position.x, 
                body.position.y - BUCKET_HEIGHT/2,
                body.position.x, 
                body.position.y + BUCKET_HEIGHT/2
            );
            grd.addColorStop(0, '#88CCFF');  // Lighter blue
            grd.addColorStop(0.5, '#4488CC'); // Medium blue
            grd.addColorStop(1, '#2266AA');   // Darker blue
            
            // Draw bucket with gradient using the custom shape
            ctx.beginPath();
            ctx.moveTo(vertices[0].x, vertices[0].y);
            for (let j = 1; j < vertices.length; j++) {
                ctx.lineTo(vertices[j].x, vertices[j].y);
            }
            ctx.closePath();
            ctx.fillStyle = grd;
            ctx.fill();
            
            // Add a subtle edge highlight without the glow
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Add text indicating the bonus
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '14px "VT323", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('+20 POINTS', body.position.x, body.position.y + 5);
            
            // Restore canvas state
            ctx.restore();
        }
    }
    
    // Ensure global alpha is reset before drawing UI
    render.context.globalAlpha = 1.0;
    
    // Draw UI elements
    drawGame();
});

// Only run the renderer, not the engine (we'll handle that in our loop)
Render.run(render);

// Make sure we start the game loop
requestAnimationFrame(gameLoop);

// Helper functions for color manipulation and drawing
function lightenColor(color, amount) {
    return adjustColor(color, amount);
}

function darkenColor(color, amount) {
    return adjustColor(color, -amount);
}

function adjustColor(color, amount) {
    // Parse hex color to RGB
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    if (!result) return color;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    const newR = Math.max(0, Math.min(255, r + amount));
    const newG = Math.max(0, Math.min(255, g + amount));
    const newB = Math.max(0, Math.min(255, b + amount));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
}

function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

// Function to generate a new background for each level
function generateBackgroundPattern(level) {
    // Calculate intensity based on level (capped at maximum, with gentler curve)
    backgroundIntensity = Math.min(BACKGROUND_MAX_INTENSITY, 1.0 + (level - 1) * 0.15); // Reduced from 0.2
    
    // Select a color scheme based on level - more unsettling colors at higher levels
    const schemeIndex = Math.min(BACKGROUND_COLORS.length - 1, Math.floor((level - 1) / 4)); // Slower progression (was /3)
    currentBackgroundScheme = BACKGROUND_COLORS[schemeIndex];
    
    // Clear existing particles
    backgroundParticles = [];
    
    // Number of particles increases with level but is capped
    const particleCount = Math.min(
        Math.floor(BACKGROUND_PARTICLE_COUNT * (1 + (backgroundIntensity - 1) * 0.6)), // Reduced scaling factor
        BACKGROUND_MAX_PARTICLES
    );
    
    // Pre-calculate grid lines for improved performance
    // Grid size gets smaller at higher levels but not as extreme
    const gridSize = Math.max(25, 40 - (level * 0.8)); // Reduced rate of decrease (was 1.2)
    backgroundGridLines = {
        horizontal: [],
        vertical: []
    };
    
    // Generate vertical grid line positions
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        backgroundGridLines.vertical.push(x);
    }
    
    // Generate horizontal grid line positions
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        backgroundGridLines.horizontal.push(y);
    }
    
    // Set visual distortion level based on level difficulty (further toned down)
    visualDistortionLevel = Math.max(0, (level - 6) / 20); // Delayed onset and reduced effect
    screenShakeAmount = Math.max(0, (level - 10) / 40); // Delayed onset and reduced effect
    
    // Generate new particles with more variety
    for (let i = 0; i < particleCount; i++) {
        // Higher levels have more highlight colors
        const colorIndex = level > 5 ? 
            (Math.random() > 0.6 ? 2 : (Math.random() > 0.5 ? 1 : 0)) : // Less highlight colors
            (Math.random() > 0.7 ? 2 : (Math.random() > 0.5 ? 1 : 0));
        
        // Higher levels have more angular/edgy shapes but not as dominant
        let shape;
        if (level <= 3) {
            // Mostly circles and squares in early levels
            shape = Math.floor(Math.random() * 2);
        } else if (level <= 7) {
            // More diamonds and stars in mid levels
            shape = Math.random() < 0.7 ? Math.floor(Math.random() * 2) : Math.floor(Math.random() * 2) + 2;
        } else {
            // More angular shapes in higher levels but still keep some variety
            shape = Math.random() < 0.5 ? Math.floor(Math.random() * 2) + 2 : Math.floor(Math.random() * 2); // More circles/squares (was 0.6)
        }
        
        // Particles move faster and are more chaotic at higher levels (further toned down)
        const speedFactor = 1.0 + (level / 20); // Reduced from /15
        const spinFactor = 1.0 + (level / 12); // Reduced from /8
        
        backgroundParticles.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 2 + Math.random() * 5 * backgroundIntensity, // Reduced from 6
            speed: (0.2 + Math.random() * 0.3 * backgroundIntensity) * speedFactor, // Reduced from 0.4
            direction: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.015 * backgroundIntensity * spinFactor, // Reduced from 0.02
            opacity: 0.1 + Math.random() * 0.3, // Reduced from 0.4
            color: currentBackgroundScheme[colorIndex],
            shape: shape, // 0: circle, 1: square, 2: diamond, 3: star, 4: triangle
            pulse: 0.2 + Math.random() * 0.5, // Reduced from 0.3 + random * 0.7
            pulsePhase: Math.random() * Math.PI * 2, // Random starting phase
            // Add erratic behavior properties for higher levels (further toned down)
            erraticMovement: Math.random() * Math.min(0.5, (level - 4) / 20), // Reduced max and slower increase
            glitchChance: Math.min(0.05, (level - 7) * 0.004) // Reduced and delayed onset
        });
    }
}

// Function to update the background animation
function updateBackgroundAnimation(deltaTime) {
    // Skip if there are no particles
    if (!backgroundParticles || backgroundParticles.length === 0) return;
    
    // Frame skipping for performance optimization
    backgroundFrameCounter = (backgroundFrameCounter + 1) % BACKGROUND_FRAME_SKIP;
    if (backgroundFrameCounter !== 0) return;
    
    // Get current time for animation effects
    const currentTime = Date.now() / 1000;
    
    // Update screen shake effect - decays over time
    if (screenShakeAmount > 0) {
        screenShakeAmount = Math.max(0, screenShakeAmount - 0.0002 * deltaTime); // Faster decay (was 0.0001)
    }
    
    // Update each particle
    for (let i = 0; i < backgroundParticles.length; i++) {
        const particle = backgroundParticles[i];
        
        // Higher chance of direction change with higher levels (further toned down)
        if (Math.random() < (0.005 * backgroundIntensity) + particle.erraticMovement * 0.01) { // Reduced from 0.008 and 0.015
            const changeAmount = (Math.random() - 0.5) * Math.PI * 0.2 * backgroundIntensity; // Reduced from 0.3
            particle.direction += changeAmount * (1 + particle.erraticMovement * 1.2); // Reduced multiplier
        }
        
        // Add erratic behavior at higher levels
        let velocityX = Math.cos(particle.direction) * particle.speed;
        let velocityY = Math.sin(particle.direction) * particle.speed;
        
        // Add sine wave motion for some particles at higher levels (further toned down)
        if (particle.erraticMovement > 0.45) { // Increased threshold (was 0.4)
            velocityX += Math.sin(currentTime * 1.2 + i) * particle.erraticMovement * 0.15; // Reduced from 0.2
            velocityY += Math.cos(currentTime * 1.0 + i * 0.7) * particle.erraticMovement * 0.15; // Reduced from 0.2
        }
        
        // Update particle position
        particle.x += velocityX * deltaTime * 0.1;
        particle.y += velocityY * deltaTime * 0.1;
        
        // Rotate direction for spinning effect
        particle.direction += particle.spin * deltaTime * 0.1;
        
        // Wrap particles around screen edges
        if (particle.x < -50) particle.x = CANVAS_WIDTH + 50;
        if (particle.x > CANVAS_WIDTH + 50) particle.x = -50;
        if (particle.y < -50) particle.y = CANVAS_HEIGHT + 50;
        if (particle.y > CANVAS_HEIGHT + 50) particle.y = -50;
        
        // Smoother pulsing effect using sine wave
        // More extreme pulsing at higher levels (further toned down)
        const pulseMagnitude = 0.15 + (backgroundIntensity - 1) * 0.07; // Reduced from 0.2 and 0.1
        particle.currentSize = particle.size * (1 + pulseMagnitude * Math.sin(currentTime * particle.pulse + particle.pulsePhase));
        
        // Occasionally change opacity for sparkling effect
        if (Math.random() < 0.015 * backgroundIntensity) { // Reduced from 0.02
            particle.opacity = Math.max(0.05, Math.min(0.4, particle.opacity + (Math.random() - 0.5) * 0.06)); // Reduced from 0.5 and 0.08
        }
        
        // "Glitch" effect for higher levels - occasionally teleport particles (further toned down)
        if (Math.random() < particle.glitchChance) {
            if (Math.random() < 0.2) { // Reduced chance of teleport (was 0.3)
                // Teleport
                particle.x = Math.random() * CANVAS_WIDTH;
                particle.y = Math.random() * CANVAS_HEIGHT;
            } else {
                // Color glitch
                const colorIndex = Math.floor(Math.random() * 3);
                particle.color = currentBackgroundScheme[colorIndex];
            }
        }
    }
}

// Function to draw the animated background
function drawBackground(ctx) {
    // Get current time for animations
    const currentTime = Date.now() / 1000;
    
    // Apply screen shake for higher levels (further toned down)
    let offsetX = 0, offsetY = 0;
    if (screenShakeAmount > 0) {
        offsetX = (Math.random() - 0.5) * screenShakeAmount * 4; // Reduced from 6
        offsetY = (Math.random() - 0.5) * screenShakeAmount * 4; // Reduced from 6
        ctx.save();
        ctx.translate(offsetX, offsetY);
    }
    
    // Create gradient background based on current color scheme with subtle movement
    // Movement becomes more pronounced at higher levels (further toned down)
    const movementIntensity = 0.08 + (backgroundIntensity - 1) * 0.02; // Reduced from 0.1 and 0.03
    const gradientOffset = Math.sin(currentTime * 0.15) * movementIntensity; // Reduced speed from 0.2
    const bgGradient = ctx.createRadialGradient(
        CANVAS_WIDTH * (0.5 + gradientOffset), CANVAS_HEIGHT * (0.5 - gradientOffset), 0,
        CANVAS_WIDTH * 0.5, CANVAS_HEIGHT * 0.5, CANVAS_WIDTH * 0.8
    );
    
    // Use current scheme colors for gradient with highlight
    bgGradient.addColorStop(0, currentBackgroundScheme[2]); // Highlight color in center
    bgGradient.addColorStop(0.3, currentBackgroundScheme[1]); // Mid color
    bgGradient.addColorStop(1, currentBackgroundScheme[0]); // Outer color (darker)
    
    // Fill background
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Add subtle space-like stars in the background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 40; i++) {
        // Use fixed positions based on index for consistent starfield
        const x = (173 * i) % CANVAS_WIDTH;
        const y = (257 * i) % CANVAS_HEIGHT;
        
        // Stars get smaller and more intense at higher levels (further toned down)
        const sizeFactor = Math.max(0.8, 1.0 - (visualDistortionLevel * 0.2)); // Reduced effect (was 0.7 and 0.3)
        const size = ((i % 3) === 0) ? 1.5 * sizeFactor : 0.8 * sizeFactor;
        
        // Faster twinkling at higher levels (further toned down)
        const twinkleSpeed = 0.4 + (backgroundIntensity - 1) * 0.15; // Reduced from 0.5 and 0.2
        const twinkle = 0.4 + 0.6 * Math.sin(currentTime * twinkleSpeed * (0.5 + (i % 10) / 10) + i * 0.3);
        
        ctx.globalAlpha = twinkle;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    
    // Add a grid pattern, more intense at higher levels (further toned down)
    const gridIntensity = 0.025 + (backgroundIntensity - 1) * 0.01; // Reduced from 0.03 and 0.015
    
    // Grid distortion increases with level (further toned down)
    const gridDistortion = Math.min(0.2, visualDistortionLevel * 0.15); // Reduced from 0.3 and 0.2
    
    // Grid animation gets faster with higher levels (but not as much)
    const gridAnimationSpeed = 2200 - (backgroundIntensity * 200); // Slowed down (was 2000 and 300)
    const gridOffset = (Date.now() / gridAnimationSpeed) % 40;
    
    ctx.strokeStyle = `rgba(255, 255, 255, ${gridIntensity})`;
    ctx.lineWidth = 1;
    
    // Batch grid drawing for better performance
    if (gridIntensity > 0.01) {
        // Draw vertical grid lines with distortion
        ctx.beginPath();
        for (const x of backgroundGridLines.vertical) {
            const xPos = x + gridOffset;
            if (xPos < CANVAS_WIDTH) {
                ctx.moveTo(xPos, 0);
                // Add waviness/distortion to grid lines at higher levels
                if (gridDistortion > 0) {
                    // Draw a wavy line with toned down distortion
                    for (let y = 0; y < CANVAS_HEIGHT; y += 5) {
                        const waveX = xPos + Math.sin(y * 0.05 + currentTime * 1.5) * gridDistortion * 8; // Reduced from 2.0 and 10
                        ctx.lineTo(waveX, y);
                    }
                } else {
                    // Straight line for lower levels
                    ctx.lineTo(xPos, CANVAS_HEIGHT);
                }
            }
        }
        ctx.stroke();
        
        // Draw horizontal grid lines with distortion
        ctx.beginPath();
        for (const y of backgroundGridLines.horizontal) {
            const yPos = y + gridOffset;
            if (yPos < CANVAS_HEIGHT) {
                ctx.moveTo(0, yPos);
                // Add waviness/distortion at higher levels
                if (gridDistortion > 0) {
                    // Draw a wavy line with toned down distortion
                    for (let x = 0; x < CANVAS_WIDTH; x += 5) {
                        const waveY = yPos + Math.sin(x * 0.05 + currentTime * 1.0) * gridDistortion * 8; // Reduced from 1.5 and 10
                        ctx.lineTo(x, waveY);
                    }
                } else {
                    // Straight line for lower levels
                    ctx.lineTo(CANVAS_WIDTH, yPos);
                }
            }
        }
        ctx.stroke();
    }
    
    // Draw animated particles
    for (let i = 0; i < backgroundParticles.length; i++) {
        const particle = backgroundParticles[i];
        
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.direction);
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;
        
        // Use current particle size (which may be pulsing)
        const currentSize = particle.currentSize || particle.size;
        
        // Draw different shapes based on particle.shape
        switch (particle.shape) {
            case 0: // Circle
                ctx.beginPath();
                ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 1: // Square
                ctx.fillRect(-currentSize/2, -currentSize/2, currentSize, currentSize);
                break;
                
            case 2: // Diamond
                ctx.beginPath();
                ctx.moveTo(0, -currentSize);
                ctx.lineTo(currentSize, 0);
                ctx.lineTo(0, currentSize);
                ctx.lineTo(-currentSize, 0);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 3: // Star
                drawStar(ctx, 0, 0, 5, currentSize, currentSize/2);
                break;
                
            case 4: // Triangle - more angular/threatening for higher levels
                ctx.beginPath();
                ctx.moveTo(0, -currentSize);
                ctx.lineTo(currentSize * 0.866, currentSize * 0.5); // 30 degrees
                ctx.lineTo(-currentSize * 0.866, currentSize * 0.5); // -30 degrees
                ctx.closePath();
                ctx.fill();
                break;
        }
        
        // Add glitch effects for higher levels (toned down)
        if (visualDistortionLevel > 0.3 && Math.random() < 0.07 * visualDistortionLevel) { // Increased threshold, reduced chance
            // Glitch effect - draw the same shape offset and with different color
            ctx.globalAlpha = particle.opacity * 0.6; // Reduced from 0.7
            ctx.fillStyle = currentBackgroundScheme[(Math.floor(Math.random() * 3))];
            
            // Random offset (reduced)
            ctx.translate((Math.random() - 0.5) * 3 * visualDistortionLevel, 
                          (Math.random() - 0.5) * 3 * visualDistortionLevel);
                          
            // Draw the same shape again with slight distortion
            switch (particle.shape) {
                case 0: // Circle glitch
                    ctx.beginPath();
                    ctx.arc(0, 0, currentSize * (0.8 + Math.random() * 0.4), 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case 1: // Square glitch
                    const distortSize = currentSize * (0.8 + Math.random() * 0.4);
                    ctx.fillRect(-distortSize/2, -distortSize/2, distortSize, distortSize);
                    break;
                case 2: // Diamond glitch
                case 3: // Star glitch
                case 4: // Triangle glitch
                    // Use a circle for glitch effect regardless of original shape
                    ctx.beginPath();
                    ctx.arc(0, 0, currentSize * (0.8 + Math.random() * 0.4), 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
        
        // Add glow effect for particles (more intense at higher levels but toned down)
        const glowIntensity = Math.min(0.4, 0.2 + (backgroundIntensity - 1) * 0.07); // Reduced from 0.1
        if (backgroundIntensity > 1.2 && Math.random() > 0.45) { // Increased threshold
            const glowSize = currentSize * 1.4; // Reduced from 1.5
            const glowOpacity = particle.opacity * glowIntensity;
            
            ctx.globalAlpha = glowOpacity;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Add subtle color pulse overlay based on level intensity (toned down)
    const pulseSpeed = 0.7 * backgroundIntensity; // Reduced from 0.8
    const pulseIntensity = 0.05 + 0.07 * Math.sin(currentTime * pulseSpeed) * (backgroundIntensity - 1) / 2.5; // Reduced from 0.1 and division by 2
    
    if (backgroundIntensity > 1.4) { // Increased threshold
        try {
            // Use highlighted color for pulse effect
            const r = parseInt(currentBackgroundScheme[2].substr(1, 2), 16);
            const g = parseInt(currentBackgroundScheme[2].substr(3, 2), 16);
            const b = parseInt(currentBackgroundScheme[2].substr(5, 2), 16);
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pulseIntensity})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } catch (e) {
            // Fallback if color parsing fails
            ctx.fillStyle = `rgba(255, 255, 255, ${pulseIntensity})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
    }
    
    // Add vignette effect for higher levels - darkened corners (toned down)
    if (backgroundIntensity > 1.8) { // Increased threshold
        const vignetteIntensity = Math.min(0.5, (backgroundIntensity - 1.8) * 0.25); // Reduced from 0.7 and 0.3
        const gradient = ctx.createRadialGradient(
            CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT * 0.3, // Increased inner radius from 0.2
            CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT * 0.8
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${vignetteIntensity})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // Restore from screen shake if applied
    if (screenShakeAmount > 0) {
        ctx.restore();
    }
}

// Add a helper function to convert hex to rgba
function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper function to get available colors for the current level
function getAvailableColorsForLevel(level) {
    if (level <= 2) return 4;  // Levels 1-2: 4 colors
    if (level >= 3 && level <= 10) return 6;  // Levels 3-10: 6 colors
    if (level >= 11) return 8;  // Levels 11+: 8 colors
    return 4; // Default to 4 if level is out of range
}

// Add event listener for level skipping
document.addEventListener('keydown', (event) => {
    // Level skip functionality - press 'L' to activate level input mode
    if (event.key === 'l' || event.key === 'L') {
        waitingForLevelInput = true;
        levelInputBuffer = '';
        console.log('Enter level number and press Enter');
    }
    
    // If in level input mode, collect digits or process Enter key
    if (waitingForLevelInput) {
        if (event.key === 'Enter') {
            // Process the level input
            const targetLevel = parseInt(levelInputBuffer, 10);
            if (!isNaN(targetLevel) && targetLevel > 0) {
                skipToLevel(targetLevel);
            }
            // Reset input mode
            waitingForLevelInput = false;
            levelInputBuffer = '';
        } else if (/^\d$/.test(event.key)) {
            // Collect digit
            levelInputBuffer += event.key;
            console.log(`Level input: ${levelInputBuffer}`);
        } else if (event.key === 'Escape') {
            // Cancel input mode
            waitingForLevelInput = false;
            levelInputBuffer = '';
            console.log('Level input cancelled');
        }
    }
});

/**
 * Debug function to skip to the next level
 */
function skipToNextLevel() {
    if (levelCompleted) return; // Don't skip if already transitioning
    
    console.log(`Skipping to level ${currentLevel + 1}`);
    
    // Simulate level completion
    levelCompleted = true;
    
    // Start level transition effect
    levelTransitionEffect = {
        active: true,
        startTime: Date.now(),
        duration: 1000,
        nextLevel: currentLevel + 1
    };
    
    // Reset for next level after a shorter delay (for debugging)
    setTimeout(() => {
        currentLevel++;
        resetLevel();
        
        // End transition effect
        levelTransitionEffect.active = false;
    }, 1500); // Reduced from 3000ms
}

/**
 * Debug function to skip to a specific level
 */
function skipToLevel(level) {
    if (levelCompleted) return; // Don't skip if already transitioning
    if (level === currentLevel) return; // No need to skip to current level
    
    console.log(`Skipping to level ${level}`);
    
    // Start level transition effect
    levelTransitionEffect = {
        active: true,
        startTime: Date.now(),
        duration: 1000,
        nextLevel: level
    };
    
    // Reset for specified level after a delay
    setTimeout(() => {
        currentLevel = level;
        resetLevel();
        
        // End transition effect
        levelTransitionEffect.active = false;
    }, 1500); // Reduced from 3000ms
}

// Add this new function near other visual effect functions
function createBounceEffect(x, y) {
    // Create a small animation to indicate the powerful bounce
    const bounceCanvas = document.createElement('canvas');
    bounceCanvas.width = 100;
    bounceCanvas.height = 100;
    bounceCanvas.style.position = 'absolute';
    bounceCanvas.style.left = (x - 50) + 'px';
    bounceCanvas.style.top = (y - 50) + 'px';
    bounceCanvas.style.pointerEvents = 'none';
    bounceCanvas.style.zIndex = '10';
    document.body.appendChild(bounceCanvas);
    
    const ctx = bounceCanvas.getContext('2d');
    let frameCount = 0;
    
    const animateBounce = () => {
        ctx.clearRect(0, 0, 100, 100);
        
        // Draw circles that expand and fade
        const alpha = 1 - (frameCount / 10);
        if (alpha <= 0) {
            document.body.removeChild(bounceCanvas);
            return;
        }
        
        // Draw expanding circle
        ctx.beginPath();
        ctx.arc(50, 50, frameCount * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.fill();
        
        // Draw smaller inner particles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const distance = frameCount * 3;
            const particleX = 50 + Math.cos(angle) * distance;
            const particleY = 50 + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(200, 230, 255, ${alpha})`;
            ctx.fill();
        }
        
        frameCount++;
        requestAnimationFrame(animateBounce);
    };
    
    animateBounce();
}