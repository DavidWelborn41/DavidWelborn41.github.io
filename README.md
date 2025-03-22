# PeggleRogue

A browser-based physics game inspired by Peggle, featuring dynamic ball physics, vibrant visuals, and progressive levels with color-based objectives.

![PeggleRogue Game](https://via.placeholder.com/800x400?text=PeggleRogue+Screenshot)

## Description

PeggleRogue is a physics-based game where players shoot balls at colored pegs to score points and advance through levels. The game features:

- Dynamic physics-based ball movement and collisions
- Vibrant animated pegs with digital/glitch aesthetic
- Color-based progression system (hit enough pegs of each color to advance)
- Metallic ball with realistic 3D rendering and rotation physics
- Procedurally generated levels with increasing difficulty
- Automatic bucket movement for bonus scoring opportunities
- Visual trajectory prediction for aiming precision

## Game Features

### Core Mechanics
- **Aiming System**: Click to launch balls from the top launcher in your chosen direction
- **Peg Clearing**: Hit pegs to make them light up and eventually clear
- **Physics Engine**: Realistic ball movement and collisions with Matter.js physics
- **Color Progression**: More colors are introduced as you advance through levels
  - Levels 1-2: 4 colors
  - Levels 3-10: 6 colors
  - Levels 11+: 8 colors
- **Level Progression**: Meet color threshold requirements to advance to the next level
- **Scoring System**: Points for hitting pegs (10 points), bonus for hitting the bucket (20 points), and level completion bonuses

### Level Generation
- **Procedural Generation**: Each level is uniquely generated with increasing complexity
- **Pattern Variations**: Multiple pattern types (grid, checkerboard, diamond, spiral, tunnel, wave, vortex, etc.)
- **Difficulty Scaling**: Higher levels introduce more complex patterns and tighter arrangements
- **Color Balancing**: Intelligent distribution of colors to ensure each level is completable
- **Special Formations**: Challenge clusters and color gradients in higher levels

### Visual Elements
- **Dynamic Pegs**: Color-specific styling with visual effects when hit
- **3D Ball Rendering**: Metallic ball with realistic lighting, reflections, and rotation
- **Animated Background**: Dynamic patterns that evolve based on the current level
- **Trajectory Prediction**: Visual guide showing the predicted path of your shot
- **Color Progress Meters**: Real-time tracking of completion requirements for each color
- **Retro-Inspired UI**: Stylized interface with digital aesthetic

## Technologies Used

- HTML5 Canvas for rendering
- JavaScript (ES6+)
- Matter.js for 2D physics simulation
- Custom rendering pipeline for visual effects
- Procedural generation for level creation

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:8080`

## How to Play

1. Move your mouse to aim the launcher
2. Click to shoot a ball
3. Hit pegs to score points and progress
4. For each color, you must hit a certain percentage of pegs (indicated by markers on the progress bars)
5. The moving bucket at the bottom provides bonus points when hit
6. Complete each level by meeting the color thresholds
7. Advance through progressively more challenging levels

## Project Structure

- `src/` - Source code
  - `game.js` - Main game logic, physics, and rendering systems
  - `levelGenerator.js` - Procedural level generation with increasing difficulty
  - `index.html` - Basic HTML structure
  - `styles.css` - Game styling and visual effects

## Future Enhancements

- Saved high scores
- Additional level patterns and challenges
- Special power-ups and abilities
- Sound effects and music
- Mobile support for touch devices

## License

MIT License 