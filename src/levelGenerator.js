// Level Generator for PeggleRogue
// This module provides procedural level generation and premade patterns

/**
 * Class to handle level generation with increasing difficulty
 */
class LevelGenerator {
    constructor(pegRadius, canvasWidth, canvasHeight) {
        this.pegRadius = pegRadius;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Level difficulty parameters
        this.minPegSpacing = 50; // Minimum spacing between pegs
        this.maxPatterns = 4;    // Maximum number of patterns per level (increased from 3)
        
        // Number of colors available at different level thresholds
        this.colorProgression = [
            { level: 1, colors: 4 },    // Levels 1-2: 4 colors (0-3)
            { level: 3, colors: 6 },    // Levels 3-10: 6 colors (0-5)
            { level: 11, colors: 8 }    // Levels 11+: 8 colors (0-7)
        ];
        
        // Pattern definitions (each returns an array of peg positions and colors)
        this.patterns = {
            // Basic patterns
            grid: this.createGridPattern.bind(this),
            checkerboard: this.createCheckerboardPattern.bind(this),
            diamond: this.createDiamondPattern.bind(this),
            
            // Complex patterns
            spiral: this.createSpiralPattern.bind(this),
            tunnel: this.createTunnelPattern.bind(this),
            wave: this.createWavePattern.bind(this),
            vortex: this.createVortexPattern.bind(this),
            
            // New patterns
            concentric: this.createConcentricPattern.bind(this),
            zigzag: this.createZigzagPattern.bind(this),
            hourglass: this.createHourglassPattern.bind(this),
            maze: this.createMazePattern.bind(this),
            
            // Random patterns
            random: this.createRandomPattern.bind(this),
            clustered: this.createClusteredPattern.bind(this)
        };
        
        // Pattern difficulty ratings (1-10 scale)
        this.patternDifficulty = {
            grid: 1,
            checkerboard: 2,
            random: 3,
            diamond: 4,
            wave: 5,
            clustered: 6,
            tunnel: 7,
            spiral: 8,
            vortex: 10,
            concentric: 6,
            zigzag: 7,
            hourglass: 8,
            maze: 9
        };
        
        // Equal margin on both sides
        this.horizontalMargin = 100; // Increased from 80 for more consistent spacing
        
        // Minimum peg counts for levels
        this.basePegCount = 40; // Baseline minimum peg count
        this.minPegCountPerLevel = 35; // Minimum pegs for level 1
        this.pegIncreasePerLevel = 5; // Additional pegs per level (increased from 3)
        this.maxPegCount = 120; // Maximum number of pegs (increased from 100)
    }
    
    /**
     * Get the number of colors available for the current level
     */
    getAvailableColors(levelNumber) {
        // Find the highest color progression threshold that's <= current level
        let availableColors = 4; // Default
        
        for (const progression of this.colorProgression) {
            if (levelNumber >= progression.level) {
                availableColors = progression.colors;
            } else {
                break; // Stop once we exceed the current level
            }
        }
        
        return availableColors;
    }
    
    /**
     * Calculate minimum required pegs for a level
     */
    getMinimumPegCount(levelNumber) {
        // Start with base minimum and add more for higher levels
        const minCount = this.minPegCountPerLevel + ((levelNumber - 1) * this.pegIncreasePerLevel);
        // Cap at maximum peg count
        return Math.min(minCount, this.maxPegCount);
    }
    
    /**
     * Generate a level based on the level number
     * @param {number} levelNumber - Current level number
     * @returns {Array} Array of peg objects with x, y, and colorIndex properties
     */
    generateLevel(levelNumber) {
        // Store current level number for use in pattern generation
        this.currentLevelNumber = levelNumber;
        
        // Adjust difficulty based on level number
        const difficultyFactor = Math.min(10, Math.floor(levelNumber / 2) + 1); // Increased from /3 to /2
        
        // Adjust spacing based on level (higher levels = tighter spacing)
        const pegSpacing = Math.max(
            this.minPegSpacing - (levelNumber * 1.8), // Increased from 1.5
            this.pegRadius * 2.3 // Decreased from 2.5 for tighter packing
        );
        
        // Determine how many patterns to use for this level
        const patternCount = Math.min(
            this.maxPatterns,
            1 + Math.floor(levelNumber / 2)
        );
        
        // Choose patterns based on difficulty
        const availablePatterns = this.selectPatternsByDifficulty(difficultyFactor);
        
        // Calculate minimum required pegs for this level
        const minPegCount = this.getMinimumPegCount(levelNumber);
        
        // Get available colors for this level
        const availableColors = this.getAvailableColors(levelNumber);
        
        // Generate the actual level - all levels now use procedural generation
        let pegs;
        
        // Simplify early levels while keeping them procedural
        if (levelNumber === 1) {
            // Level 1: Simple procedural pattern with mostly grid
            pegs = this.generateSimpleLevel(levelNumber, pegSpacing, availablePatterns);
        } else if (levelNumber === 2) {
            // Level 2: Slightly more complex but still approachable
            pegs = this.generateIntermediateLevel(levelNumber, pegSpacing, availablePatterns);
        } else if (levelNumber === 3) {
            // Level 3: Introduces more complexity but still guided
            pegs = this.generateAdvancedLevel(levelNumber, pegSpacing, availablePatterns);
        } else {
            // Higher levels use fully procedural generation with increasing complexity
            pegs = this.generateProceduralLevel(levelNumber, patternCount, availablePatterns, pegSpacing);
        }
        
        // Ensure we have enough pegs
        if (pegs.length < minPegCount) {
            pegs = this.ensureMinimumPegs(pegs, minPegCount, pegSpacing, levelNumber, availableColors);
        }
        
        // Apply color balancing and limit to available colors for this level
        pegs = this.balanceColors(pegs, availableColors, levelNumber);
        
        return pegs;
    }
    
    /**
     * Generate a simple but procedural level for level 1
     */
    generateSimpleLevel(levelNumber, pegSpacing, availablePatterns) {
        // Create a simplified level structure focusing on basic patterns
        // For level 1, use a grid or checkerboard as the primary pattern
        
        // Use center of playfield
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const playableWidth = this.canvasWidth - (this.horizontalMargin * 2);
        
        // Generate a clean, simple grid pattern for easiest learning
        const gridCols = Math.floor(playableWidth / pegSpacing);
        const gridRows = 6; // Fewer rows for simplicity
        const actualGridWidth = gridCols * pegSpacing;
        const centeredGridStartX = centerX - (actualGridWidth / 2);
        
        // Higher density for level 1 to ensure enough pegs
        const density = 0.8;
        
        return this.createGridPattern(centeredGridStartX, 180, gridCols, gridRows, pegSpacing, density);
    }
    
    /**
     * Generate an intermediate procedural level for level 2
     */
    generateIntermediateLevel(levelNumber, pegSpacing, availablePatterns) {
        // Level 2 introduces simple pattern combinations
        const pegs = [];
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const playableWidth = this.canvasWidth - (this.horizontalMargin * 2);
        
        // Choose two simple patterns to combine
        const simplePatterns = ['grid', 'checkerboard', 'diamond'].filter(
            pattern => availablePatterns.includes(pattern)
        );
        
        // If we don't have enough simple patterns, add random
        if (simplePatterns.length < 2) {
            simplePatterns.push('random');
        }
        
        // Choose two patterns
        const pattern1 = simplePatterns[0];
        const pattern2 = simplePatterns[simplePatterns.length > 1 ? 1 : 0];
        
        // Create two sections
        const sections = this.divideCanvasIntoSections(2);
        
        // Generate pattern 1
        const pattern1Func = this.patterns[pattern1];
        const pattern1Pegs = this.generatePatternInSection(
            pattern1Func,
            sections[0],
            pegSpacing,
            levelNumber
        );
        
        // Generate pattern 2
        const pattern2Func = this.patterns[pattern2];
        const pattern2Pegs = this.generatePatternInSection(
            pattern2Func,
            sections[1],
            pegSpacing,
            levelNumber
        );
        
        // Combine pegs
        pegs.push(...pattern1Pegs, ...pattern2Pegs);
        
        return pegs;
    }
    
    /**
     * Generate an advanced procedural level for level 3
     */
    generateAdvancedLevel(levelNumber, pegSpacing, availablePatterns) {
        // Level 3 introduces slightly more complex patterns with some randomness
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        // Generate a more complex level with 2-3 patterns
        const patternCount = 2 + (Math.random() > 0.5 ? 1 : 0);
        
        // Filter for medium complexity patterns
        const mediumPatterns = availablePatterns.filter(pattern => {
            const difficulty = this.patternDifficulty[pattern] || 5;
            return difficulty >= 2 && difficulty <= 6;
        });
        
        // If we don't have enough medium patterns, use any available patterns
        const patterns = mediumPatterns.length >= patternCount ? 
            mediumPatterns : availablePatterns;
        
        // Select random patterns
        const selectedPatterns = [];
        for (let i = 0; i < patternCount; i++) {
            if (patterns.length > 0) {
                const index = Math.floor(Math.random() * patterns.length);
                selectedPatterns.push(patterns[index]);
                patterns.splice(index, 1); // Remove to avoid duplicates
            }
        }
        
        // Generate procedural level with the selected patterns
        return this.generateProceduralLevel(
            levelNumber,
            selectedPatterns.length,
            selectedPatterns,
            pegSpacing
        );
    }
    
    /**
     * Balance colors across pegs and ensure only available colors are used
     */
    balanceColors(pegs, availableColors, levelNumber) {
        // Count pegs by color
        const colorCounts = Array(8).fill(0);
        for (const peg of pegs) {
            if (peg.colorIndex < availableColors) {
                colorCounts[peg.colorIndex]++;
            }
        }
        
        // Ensure all pegs use only available colors
        const balanced = pegs.map(peg => {
            // If the peg uses a color that's not available at this level, reassign it
            if (peg.colorIndex >= availableColors) {
                // Find the color with the lowest count
                let minColorIndex = 0;
                for (let i = 1; i < availableColors; i++) {
                    if (colorCounts[i] < colorCounts[minColorIndex]) {
                        minColorIndex = i;
                    }
                }
                
                // Update counts
                colorCounts[peg.colorIndex]--;
                colorCounts[minColorIndex]++;
                
                // Return a new peg with the reassigned color
                return { ...peg, colorIndex: minColorIndex };
            }
            
            return peg;
        });
        
        // For higher levels, introduce special color patterns
        let colorPatterned = balanced;
        if (levelNumber > 3) { // Changed from >= 3 to > 3 to skip color gradients in level 3
            // In levels 4+, create color gradients by reassigning colors in certain areas
            colorPatterned = this.applyColorGradient(balanced, availableColors, levelNumber);
        }
        
        // Ensure minimum number of pegs for each available color
        return this.ensureMinimumColorCounts(colorPatterned, availableColors, levelNumber);
    }
    
    /**
     * Ensure there's a minimum number of pegs of each available color
     * This is crucial for level completion since players need to hit pegs of each color
     */
    ensureMinimumColorCounts(pegs, availableColors, levelNumber) {
        // Minimum pegs required per color (scaled by level)
        const minPerColor = Math.max(3, Math.floor(5 - levelNumber * 0.1));
        
        // For level 3, ensure more cyan pegs (cyan is index 5)
        const extraMinForCyan = levelNumber === 3 ? 2 : 0; // Reduced from 5 to 2
        
        // Count pegs by color
        const colorCounts = Array(8).fill(0);
        for (const peg of pegs) {
            // First ensure all pegs have valid color indexes
            if (peg.colorIndex >= availableColors) {
                peg.colorIndex = peg.colorIndex % availableColors;
            }
            colorCounts[peg.colorIndex]++;
        }
        
        // Debug log for Level 3
        if (levelNumber === 3) {
            console.log("Level 3 color counts before balancing:", colorCounts);
        }
        
        // Create a copy of the pegs array
        const balancedPegs = [...pegs];
        
        // For Level 3, special handling to ensure we have enough cyan pegs
        // Process cyan first if this is Level 3
        const colorOrder = levelNumber === 3 ? 
            [5, 0, 1, 2, 3, 4] : // Process cyan first for Level 3
            [...Array(availableColors).keys()]; // Normal order otherwise
        
        // Check each available color
        for (const color of colorOrder) {
            if (color >= availableColors) continue;
            
            // Add extra minimum for cyan in level 3
            const adjustedMinimum = color === 5 && levelNumber === 3 ? 
                minPerColor + extraMinForCyan : minPerColor;
                
            // If we don't have enough of this color
            if (colorCounts[color] < adjustedMinimum) {
                const needed = adjustedMinimum - colorCounts[color];
                console.log(`Level ${levelNumber}: Color ${color} needs ${needed} more pegs`);
                
                // Find colors that have excess pegs
                const excessColors = [];
                for (let c = 0; c < availableColors; c++) {
                    // For Level 3, don't use cyan (5) as an excess color to convert from
                    if (levelNumber === 3 && c === 5) continue;
                    
                    if (c !== color && colorCounts[c] > minPerColor + 2) {
                        excessColors.push(c);
                    }
                }
                
                if (excessColors.length > 0) {
                    // Convert some pegs from excess colors
                    let converted = 0;
                    
                    for (let i = 0; i < balancedPegs.length && converted < needed; i++) {
                        const peg = balancedPegs[i];
                        
                        // If this peg is of an excess color, convert it
                        if (excessColors.includes(peg.colorIndex)) {
                            balancedPegs[i] = { ...peg, colorIndex: color };
                            colorCounts[peg.colorIndex]--;
                            colorCounts[color]++;
                            converted++;
                        }
                    }
                    
                    // If we still need more, convert any pegs
                    if (converted < needed) {
                        for (let i = 0; i < balancedPegs.length && converted < needed; i++) {
                            const peg = balancedPegs[i];
                            
                            // Skip the color we're trying to increase
                            if (peg.colorIndex !== color) {
                                // For Level 3, don't convert cyan pegs to other colors
                                if (levelNumber === 3 && peg.colorIndex === 5) continue;
                                
                                balancedPegs[i] = { ...peg, colorIndex: color };
                                colorCounts[peg.colorIndex]--;
                                colorCounts[color]++;
                                converted++;
                            }
                        }
                    }
                } else {
                    // No excess colors, just convert random pegs
                    let converted = 0;
                    for (let i = 0; i < balancedPegs.length && converted < needed; i++) {
                        // Skip the color we're trying to increase
                        if (balancedPegs[i].colorIndex !== color) {
                            // For Level 3, don't convert cyan pegs to other colors
                            if (levelNumber === 3 && balancedPegs[i].colorIndex === 5) continue;
                            
                            const originalColor = balancedPegs[i].colorIndex;
                            balancedPegs[i].colorIndex = color;
                            colorCounts[originalColor]--;
                            colorCounts[color]++;
                            converted++;
                        }
                    }
                }
            }
        }
        
        // Debug log for Level 3
        if (levelNumber === 3) {
            // Count again after balancing
            const finalCounts = Array(8).fill(0);
            for (const peg of balancedPegs) {
                finalCounts[peg.colorIndex]++;
            }
            console.log("Level 3 color counts after balancing:", finalCounts);
        }
        
        // Final verification pass - ensure ALL pegs use only available colors
        for (let i = 0; i < balancedPegs.length; i++) {
            if (balancedPegs[i].colorIndex >= availableColors) {
                balancedPegs[i].colorIndex = balancedPegs[i].colorIndex % availableColors;
            }
        }
        
        return balancedPegs;
    }
    
    /**
     * Apply color gradients or patterns for higher levels
     */
    applyColorGradient(pegs, availableColors, levelNumber) {
        // Choose a gradient type based on the level
        // Add more gradient types for variety
        const gradientTypes = [
            this.horizontalGradient.bind(this),   // 0: Horizontal gradient
            this.verticalGradient.bind(this),     // 1: Vertical gradient
            this.radialGradient.bind(this),       // 2: Radial gradient
            this.stripeGradient.bind(this),       // 3: Stripe gradient
            this.noiseGradient.bind(this),        // 4: Noise gradient (new)
            this.spiralGradient.bind(this),       // 5: Spiral gradient (new)
            this.patternGradient.bind(this)       // 6: Pattern gradient (new)
        ];
        
        // Select a gradient type based on level number (with some randomness)
        // Higher levels have access to more complex gradients
        const availableTypes = Math.min(gradientTypes.length, 2 + Math.floor(levelNumber / 2));
        let gradientType = (levelNumber + Math.floor(Math.random() * 3)) % availableTypes;
        
        // For certain levels, use a blend of multiple gradients
        const useBlendedGradient = levelNumber > 6 && Math.random() < 0.4;
        
        if (useBlendedGradient) {
            // Select a second gradient to blend with
            const secondType = (gradientType + 1 + Math.floor(Math.random() * (availableTypes - 1))) % availableTypes;
            
            // Blend two gradient types
            return this.blendColorGradients(
                pegs, 
                gradientTypes[gradientType], 
                gradientTypes[secondType], 
                availableColors, 
                levelNumber
            );
        } else {
            // Apply single gradient
            return pegs.map(peg => {
                return {
                    ...peg,
                    colorIndex: gradientTypes[gradientType](peg, availableColors, levelNumber)
                };
            });
        }
    }
    
    /**
     * Blend two color gradient functions for more complex color patterns
     */
    blendColorGradients(pegs, gradientFunc1, gradientFunc2, availableColors, levelNumber) {
        // Blend factor (how much to blend between the two gradients)
        const blendFactor = 0.5 + (Math.random() * 0.4 - 0.2); // 0.3-0.7 range
        
        return pegs.map(peg => {
            // Get colors from both gradients
            const color1 = gradientFunc1(peg, availableColors, levelNumber);
            const color2 = gradientFunc2(peg, availableColors, levelNumber);
            
            // Determine which color to use based on position and blend factor
            let finalColor;
            
            // Random blending strategy based on level
            const blendType = levelNumber % 3;
            
            switch (blendType) {
                case 0: // Checkerboard blend
                    finalColor = ((Math.floor(peg.x / 50) + Math.floor(peg.y / 50)) % 2 === 0) ? 
                        color1 : color2;
                    break;
                    
                case 1: // Distance-based blend
                    const distanceFromCenter = Math.sqrt(
                        Math.pow((peg.x - this.canvasWidth/2), 2) + 
                        Math.pow((peg.y - this.canvasHeight/2), 2)
                    );
                    const normalizedDistance = distanceFromCenter / 
                        Math.sqrt(Math.pow(this.canvasWidth/2, 2) + Math.pow(this.canvasHeight/2, 2));
                    
                    finalColor = normalizedDistance < blendFactor ? color1 : color2;
                    break;
                    
                case 2: // Noise-based blend
                    finalColor = Math.random() < blendFactor ? color1 : color2;
                    break;
            }
            
            return {
                ...peg,
                colorIndex: finalColor
            };
        });
    }
    
    /**
     * Horizontal gradient coloring
     */
    horizontalGradient(peg, availableColors, levelNumber) {
        const normalizedX = (peg.x - this.horizontalMargin) / 
                           (this.canvasWidth - 2 * this.horizontalMargin);
        return Math.floor(normalizedX * availableColors);
    }
    
    /**
     * Vertical gradient coloring
     */
    verticalGradient(peg, availableColors, levelNumber) {
        const normalizedY = peg.y / this.canvasHeight;
        return Math.floor(normalizedY * availableColors);
    }
    
    /**
     * Radial gradient from center
     */
    radialGradient(peg, availableColors, levelNumber) {
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const dx = peg.x - centerX;
        const dy = peg.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.sqrt(
            centerX * centerX + centerY * centerY
        );
        const normalizedDistance = distance / maxDistance;
        return Math.floor(normalizedDistance * availableColors);
    }
    
    /**
     * Alternating stripes
     */
    stripeGradient(peg, availableColors, levelNumber) {
        // Vary stripe size based on level
        const stripeSize = 40 + (levelNumber % 3) * 15; // 40, 55, or 70 pixels
        const stripeIndex = Math.floor(peg.x / stripeSize);
        return stripeIndex % availableColors;
    }
    
    /**
     * Noise-based gradient for a more organic look
     */
    noiseGradient(peg, availableColors, levelNumber) {
        // Use a basic noise function based on position
        // This creates a more random but visually coherent pattern
        const noiseScale = 0.01 + (levelNumber * 0.002); // Scale factor for noise
        const noiseValue = this.simpleNoise(peg.x * noiseScale, peg.y * noiseScale);
        return Math.floor(noiseValue * availableColors);
    }
    
    /**
     * Spiral-based gradient
     */
    spiralGradient(peg, availableColors, levelNumber) {
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        const dx = peg.x - centerX;
        const dy = peg.y - centerY;
        
        // Calculate angle and distance
        const angle = Math.atan2(dy, dx);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate spiral value
        const spiralValue = (angle + distance * 0.01 * levelNumber) / (Math.PI * 2);
        return Math.floor((spiralValue % 1) * availableColors);
    }
    
    /**
     * Pattern-based gradient that creates distinct regions
     */
    patternGradient(peg, availableColors, levelNumber) {
        // Create a cellular pattern
        const cellSize = 100 - (levelNumber * 2); // Smaller cells for higher levels
        const cellX = Math.floor(peg.x / cellSize);
        const cellY = Math.floor(peg.y / cellSize);
        
        // Use a hash function to get a stable random value for each cell
        const hash = this.hashFunction(cellX, cellY, levelNumber);
        return hash % availableColors;
    }
    
    /**
     * Simple hash function for stable random values
     */
    hashFunction(x, y, seed) {
        return Math.abs(((x * 3733 + y * 2053) ^ seed * 4057) % 967);
    }
    
    /**
     * Simple noise function that returns values between 0 and 1
     */
    simpleNoise(x, y) {
        // Use position to generate a pseudo-random value
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return n - Math.floor(n);
    }
    
    /**
     * Ensure a minimum number of pegs by adding more if needed
     */
    ensureMinimumPegs(pegs, minCount, pegSpacing, levelNumber, availableColors) {
        console.log(`Level ${levelNumber}: Adding more pegs to reach minimum count (${pegs.length}/${minCount})`);
        
        // If we already have enough pegs, just return them
        if (pegs.length >= minCount) {
            return pegs;
        }
        
        // Calculate playable area
        const playableWidth = this.canvasWidth - (this.horizontalMargin * 2);
        const playAreaTop = 120;
        const playAreaBottom = this.canvasHeight - 80;
        
        // How many more pegs do we need?
        const pegsToAdd = minCount - pegs.length;
        
        // Create a copy of the existing pegs
        const result = [...pegs];
        
        // Add additional pegs
        const additionalPegs = this.createFillerPegs(
            this.horizontalMargin, 
            playAreaTop,
            this.canvasWidth - this.horizontalMargin,
            playAreaBottom,
            pegSpacing * 1.2, // Slightly wider spacing for filler pegs
            pegsToAdd,
            result, // Pass existing pegs to avoid overlaps
            availableColors
        );
        
        result.push(...additionalPegs);
        
        // Ensure no pegs are too close to each other or to the edges
        let filteredPegs = this.removePegOverlaps(result, pegSpacing * 0.8);
        filteredPegs = this.removeEdgePegs(filteredPegs, this.pegRadius * 2);
        
        // If we still don't have enough pegs after filtering, try again with smaller spacing
        if (filteredPegs.length < minCount && pegSpacing > this.pegRadius * 3) {
            // Reduce spacing for the next attempt
            const reducedSpacing = pegSpacing * 0.9;
            return this.ensureMinimumPegs(filteredPegs, minCount, reducedSpacing, levelNumber, availableColors);
        }
        
        return filteredPegs;
    }
    
    /**
     * Create additional "filler" pegs to reach minimum count
     */
    createFillerPegs(minX, minY, maxX, maxY, minDistance, count, existingPegs, availableColors) {
        const pegs = [];
        
        // Try to place the requested number of pegs
        let attempts = 0;
        const maxAttempts = count * 20; // Extra attempts because we're trying to place among existing pegs
        
        while (pegs.length < count && attempts < maxAttempts) {
            attempts++;
            
            // Generate random position
            const x = minX + Math.random() * (maxX - minX);
            const y = minY + Math.random() * (maxY - minY);
            
            // Check distance from other pegs
            let tooClose = false;
            
            // Check against existing pegs
            for (const peg of existingPegs) {
                const dx = peg.x - x;
                const dy = peg.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            // Check against pegs we've already added
            if (!tooClose) {
                for (const peg of pegs) {
                    const dx = peg.x - x;
                    const dy = peg.y - y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
            }
            
            if (!tooClose) {
                // Balance the colors (avoid having too many of one color)
                // Count existing pegs by color
                const colorCounts = Array(8).fill(0);
                for (const peg of existingPegs) {
                    if (peg.colorIndex < availableColors) {
                        colorCounts[peg.colorIndex]++;
                    }
                }
                
                // Add pegs we've already created
                for (const peg of pegs) {
                    if (peg.colorIndex < availableColors) {
                        colorCounts[peg.colorIndex]++;
                    }
                }
                
                // Find the color with the lowest count
                let minColorIndex = 0;
                for (let i = 1; i < availableColors; i++) {
                    if (colorCounts[i] < colorCounts[minColorIndex]) {
                        minColorIndex = i;
                    }
                }
                
                // Use the lowest count color with 70% probability, otherwise random
                const colorIndex = Math.random() < 0.7 ? 
                    minColorIndex : 
                    Math.floor(Math.random() * availableColors);
                
                pegs.push({ x, y, colorIndex });
            }
        }
        
        return pegs;
    }
    
    /**
     * Generate a procedural level with multiple patterns
     */
    generateProceduralLevel(levelNumber, patternCount, availablePatterns, pegSpacing) {
        const pegs = [];
        
        // For higher levels, we'll create more complex section arrangements
        let sections;
        
        if (levelNumber > 7) {
            // In higher levels, use overlapping patterns for more complexity
            sections = this.createOverlappingSections(patternCount, levelNumber);
        } else {
            // Lower levels use simpler divisions
            sections = this.divideCanvasIntoSections(patternCount);
        }
        
        // Select random patterns from available ones - bias toward more complex patterns for higher levels
        const selectedPatterns = this.selectRandomPatternsForLevel(availablePatterns, patternCount, levelNumber);
        
        // Generate each pattern in its section
        for (let i = 0; i < patternCount; i++) {
            const section = sections[i];
            const pattern = selectedPatterns[i];
            
            // Get the pattern function
            const patternFunc = this.patterns[pattern];
            
            // Calculate pattern parameters based on section
            const patternPegs = this.generatePatternInSection(
                patternFunc, 
                section, 
                pegSpacing, 
                levelNumber
            );
            
            // Apply procedural noise to pattern as level increases
            const noisyPatternPegs = this.applyProceduralNoise(
                patternPegs,
                levelNumber,
                pegSpacing
            );
            
            // Add pegs from this pattern
            pegs.push(...noisyPatternPegs);
        }
        
        // Add some random pegs for variety (more in higher levels)
        const randomPegCount = 10 + Math.floor(levelNumber / 2) * 5; // Increased from 5 to 10 base
        const randomPegs = this.createRandomPattern(
            this.horizontalMargin, 
            150, 
            this.canvasWidth - this.horizontalMargin, 
            this.canvasHeight - 150, 
            pegSpacing * 1.5, // Wider spacing for random pegs
            randomPegCount
        );
        
        pegs.push(...randomPegs);
        
        // For higher levels, add some special challenges
        if (levelNumber > 5) {
            // Add a small tight cluster of pegs in a random location
            const challengeCluster = this.createChallengeCluster(
                levelNumber, 
                pegSpacing * 0.8 // Tighter spacing for challenge cluster
            );
            
            pegs.push(...challengeCluster);
        }
        
        // Ensure no pegs are too close to each other or to the edges
        let filteredPegs = this.removePegOverlaps(pegs, pegSpacing * 0.8);
        
        // Also ensure pegs aren't too close to the edges
        filteredPegs = this.removeEdgePegs(filteredPegs, this.pegRadius * 2);
        
        return filteredPegs;
    }
    
    /**
     * Apply procedural noise to pattern pegs for more natural, organic layouts
     * Adds small random perturbations and occasional gaps for more interesting patterns
     */
    applyProceduralNoise(pegs, levelNumber, pegSpacing) {
        // Skip for very early levels to keep them simple
        if (levelNumber <= 2) {
            return pegs;
        }
        
        // Calculate noise parameters based on level
        // Higher levels get more noise/distortion
        const positionNoiseFactor = Math.min(0.3, 0.05 + (levelNumber * 0.02));
        const removalProbability = Math.min(0.3, 0.05 + (levelNumber * 0.01));
        const maxDisplacement = pegSpacing * positionNoiseFactor;
        
        // Apply noise to each peg with increasing intensity based on level
        return pegs.filter(() => Math.random() > removalProbability) // Randomly remove some pegs
            .map(peg => {
                // Apply position noise
                const noiseX = (Math.random() * 2 - 1) * maxDisplacement;
                const noiseY = (Math.random() * 2 - 1) * maxDisplacement;
                
                return {
                    x: peg.x + noiseX,
                    y: peg.y + noiseY,
                    colorIndex: peg.colorIndex
                };
            });
    }
    
    /**
     * Create challenging cluster formations for higher levels
     */
    createChallengeCluster(levelNumber, pegSpacing) {
        const pegs = [];
        const availableColors = this.getAvailableColors(levelNumber);
        
        // Determine a random position for the challenge
        const margin = 150; // Keep away from edges
        const x = margin + Math.random() * (this.canvasWidth - 2 * margin);
        const y = margin + Math.random() * (this.canvasHeight - 2 * margin);
        
        // Choose a challenge type based on level
        const challengeType = levelNumber % 4;
        
        switch (challengeType) {
            case 0: // Dense cluster
                {
                    const clusterSize = 5 + Math.floor(levelNumber / 3);
                    const radius = pegSpacing * 2;
                    
                    for (let i = 0; i < clusterSize; i++) {
                        const angle = (i / clusterSize) * Math.PI * 2;
                        const distance = radius * Math.random();
                        
                        pegs.push({
                            x: x + Math.cos(angle) * distance,
                            y: y + Math.sin(angle) * distance,
                            colorIndex: i % availableColors
                        });
                    }
                }
                break;
                
            case 1: // Tight line
                {
                    const lineLength = 5 + Math.floor(levelNumber / 3);
                    const angle = Math.random() * Math.PI; // Random angle
                    
                    for (let i = 0; i < lineLength; i++) {
                        pegs.push({
                            x: x + Math.cos(angle) * i * pegSpacing * 0.8,
                            y: y + Math.sin(angle) * i * pegSpacing * 0.8,
                            colorIndex: i % availableColors
                        });
                    }
                }
                break;
                
            case 2: // Small grid
                {
                    const gridSize = 2 + Math.floor(levelNumber / 4);
                    
                    for (let row = 0; row < gridSize; row++) {
                        for (let col = 0; col < gridSize; col++) {
                            pegs.push({
                                x: x + (col - gridSize/2) * pegSpacing * 0.8,
                                y: y + (row - gridSize/2) * pegSpacing * 0.8,
                                colorIndex: (row + col) % availableColors
                            });
                        }
                    }
                }
                break;
                
            case 3: // Spiral
                {
                    const spiralArms = 2 + Math.floor(levelNumber / 5);
                    const pointsPerArm = 3 + Math.floor(levelNumber / 4);
                    
                    for (let arm = 0; arm < spiralArms; arm++) {
                        const armOffset = (arm * Math.PI * 2) / spiralArms;
                        
                        for (let i = 0; i < pointsPerArm; i++) {
                            const distance = i * pegSpacing * 0.7;
                            const angle = armOffset + i * 0.4; // Spiral rotation
                            
                            pegs.push({
                                x: x + Math.cos(angle) * distance,
                                y: y + Math.sin(angle) * distance,
                                colorIndex: (arm + i) % availableColors
                            });
                        }
                    }
                }
                break;
        }
        
        return pegs;
    }
    
    /**
     * Create overlapping sections for more complex levels
     */
    createOverlappingSections(count, levelNumber) {
        const sections = [];
        
        // Reserve space at top for launcher and at bottom for bucket
        const playAreaTop = 120;
        const playAreaBottom = this.canvasHeight - 80;
        const playAreaHeight = playAreaBottom - playAreaTop;
        
        // Playable width with equal margins on both sides
        const playableWidth = this.canvasWidth - (this.horizontalMargin * 2);
        const startX = this.horizontalMargin;
        
        // Create main sections first
        const baseSections = this.divideCanvasIntoSections(count);
        sections.push(...baseSections);
        
        // Add overlapping sections
        const overlapCount = Math.min(3, Math.floor(levelNumber / 4)); // More overlaps in higher levels
        
        for (let i = 0; i < overlapCount; i++) {
            // Create an overlapping section that spans parts of multiple sections
            const sectionWidth = playableWidth * (0.3 + Math.random() * 0.4); // 30-70% of playable width
            const sectionHeight = playAreaHeight * (0.3 + Math.random() * 0.4); // 30-70% of play area height
            
            // Random position (ensuring it stays in bounds)
            const x = startX + Math.random() * (playableWidth - sectionWidth);
            const y = playAreaTop + Math.random() * (playAreaHeight - sectionHeight);
            
            sections.push({
                x,
                y,
                width: sectionWidth,
                height: sectionHeight
            });
        }
        
        return sections;
    }
    
    /**
     * Select random patterns with a bias toward more complex patterns in higher levels
     */
    selectRandomPatternsForLevel(availablePatterns, count, levelNumber) {
        // Create a weighted copy of available patterns
        const weightedPatterns = [];
        
        for (const pattern of availablePatterns) {
            // Get difficulty rating
            const difficulty = this.patternDifficulty[pattern] || 5;
            
            // Higher difficulty patterns get more weight in higher levels
            const levelFactor = Math.min(1, levelNumber / 10);
            
            // Simple patterns get more weight in early levels,
            // complex patterns get more weight in later levels
            let weight;
            if (levelNumber <= 5) {
                // Early levels - prefer simpler patterns
                weight = 10 - difficulty;
            } else {
                // Later levels - prefer more complex patterns
                weight = difficulty;
            }
            
            // Add pattern to weighted list multiple times based on weight
            for (let i = 0; i < weight; i++) {
                weightedPatterns.push(pattern);
            }
        }
        
        // Select random patterns from the weighted list
        const selected = [];
        
        for (let i = 0; i < count; i++) {
            if (weightedPatterns.length === 0) break;
            
            // Select random pattern from weighted list
            const index = Math.floor(Math.random() * weightedPatterns.length);
            const pattern = weightedPatterns[index];
            
            selected.push(pattern);
            
            // Remove all instances of this pattern to avoid duplicates
            // unless we're running out of options
            if (selected.length < count - 1) {
                for (let j = weightedPatterns.length - 1; j >= 0; j--) {
                    if (weightedPatterns[j] === pattern) {
                        weightedPatterns.splice(j, 1);
                    }
                }
            }
        }
        
        return selected;
    }
    
    /**
     * Remove any pegs that are too close to others
     */
    removePegOverlaps(pegs, minDistance) {
        const result = [];
        
        for (const peg of pegs) {
            let tooClose = false;
            
            for (const existingPeg of result) {
                const dx = existingPeg.x - peg.x;
                const dy = existingPeg.y - peg.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                result.push(peg);
            }
        }
        
        return result;
    }
    
    /**
     * Remove pegs that are too close to the canvas edges
     */
    removeEdgePegs(pegs, minEdgeDistance) {
        return pegs.filter(peg => {
            // Check distance from all four edges
            return (
                peg.x >= this.horizontalMargin + minEdgeDistance &&
                peg.x <= this.canvasWidth - this.horizontalMargin - minEdgeDistance &&
                peg.y >= minEdgeDistance &&
                peg.y <= this.canvasHeight - minEdgeDistance
            );
        });
    }
    
    /**
     * Divide the canvas into sections for patterns
     */
    divideCanvasIntoSections(count) {
        const sections = [];
        
        // Reserve space at top for launcher and at bottom for bucket
        const playAreaTop = 120;
        const playAreaBottom = this.canvasHeight - 80;
        const playAreaHeight = playAreaBottom - playAreaTop;
        
        // Playable width with equal margins on both sides
        const playableWidth = this.canvasWidth - (this.horizontalMargin * 2);
        const startX = this.horizontalMargin;
        
        // Add randomness to the division with jitter factor
        const jitterX = playableWidth * 0.1; // 10% jitter horizontally
        const jitterY = playAreaHeight * 0.1; // 10% jitter vertically
        
        if (count === 1) {
            // Just use the whole play area
            sections.push({
                x: startX,
                y: playAreaTop,
                width: playableWidth,
                height: playAreaHeight
            });
        } else if (count === 2) {
            // For two sections, randomly choose between horizontal and vertical split
            const useVerticalSplit = Math.random() > 0.5;
            
            if (useVerticalSplit) {
                // Divide vertically with some randomness
                const dividerY = playAreaTop + (playAreaHeight / 2) + (Math.random() * jitterY * 2 - jitterY);
                const gap = 30 + Math.random() * 20; // Variable gap between sections
                
                sections.push({
                    x: startX,
                    y: playAreaTop,
                    width: playableWidth,
                    height: dividerY - playAreaTop - gap/2
                });
                
                sections.push({
                    x: startX,
                    y: dividerY + gap/2,
                    width: playableWidth,
                    height: playAreaBottom - dividerY - gap/2
                });
            } else {
                // Divide horizontally with some randomness
                const dividerX = startX + (playableWidth / 2) + (Math.random() * jitterX * 2 - jitterX);
                const gap = 30 + Math.random() * 20; // Variable gap between sections
                
                sections.push({
                    x: startX,
                    y: playAreaTop,
                    width: dividerX - startX - gap/2,
                    height: playAreaHeight
                });
                
                sections.push({
                    x: dividerX + gap/2,
                    y: playAreaTop,
                    width: startX + playableWidth - dividerX - gap/2,
                    height: playAreaHeight
                });
            }
        } else {
            // For more than 2 sections, use a more dynamic approach
            // Choose between grid, columnar, or free-form division
            const divisionType = Math.floor(Math.random() * 3);
            
            switch (divisionType) {
                case 0: // Grid layout with jitter
                    {
                        const rows = Math.ceil(Math.sqrt(count));
                        const cols = Math.ceil(count / rows);
                        
                        const baseWidth = playableWidth / cols;
                        const baseHeight = playAreaHeight / rows;
                        
                        for (let i = 0; i < count; i++) {
                            const row = Math.floor(i / cols);
                            const col = i % cols;
                            
                            // Add jitter to positions
                            const xJitter = (Math.random() * jitterX * 2 - jitterX) * 0.5;
                            const yJitter = (Math.random() * jitterY * 2 - jitterY) * 0.5;
                            
                            // Add jitter to sizes (but ensure minimum size)
                            const widthJitter = Math.min(baseWidth * 0.2, Math.random() * baseWidth * 0.4 - baseWidth * 0.2);
                            const heightJitter = Math.min(baseHeight * 0.2, Math.random() * baseHeight * 0.4 - baseHeight * 0.2);
                            
                            sections.push({
                                x: startX + col * baseWidth + xJitter,
                                y: playAreaTop + row * baseHeight + yJitter,
                                width: baseWidth * 0.9 + widthJitter,
                                height: baseHeight * 0.9 + heightJitter
                            });
                        }
                    }
                    break;
                    
                case 1: // Columnar division
                    {
                        // Split into columns with varying widths
                        let remainingWidth = playableWidth;
                        let currentX = startX;
                        
                        for (let i = 0; i < count; i++) {
                            // Last column gets all remaining width
                            const isLast = i === count - 1;
                            
                            // Calculate column width with variation
                            const columnWidthBase = isLast ? remainingWidth : remainingWidth / (count - i);
                            const variation = isLast ? 0 : columnWidthBase * 0.3;
                            const columnWidth = columnWidthBase + (Math.random() * variation * 2 - variation);
                            
                            // Add section
                            sections.push({
                                x: currentX,
                                y: playAreaTop,
                                width: columnWidth,
                                height: playAreaHeight
                            });
                            
                            // Update for next column
                            currentX += columnWidth;
                            remainingWidth -= columnWidth;
                        }
                    }
                    break;
                    
                case 2: // Free-form organic division
                    {
                        // Start with entire canvas
                        const fullSection = {
                            x: startX,
                            y: playAreaTop,
                            width: playableWidth,
                            height: playAreaHeight
                        };
                        
                        sections.push(fullSection);
                        
                        // Recursively subdivide sections until we have enough
                        while (sections.length < count) {
                            // Choose largest section to split
                            let largestIndex = 0;
                            let largestArea = 0;
                            
                            for (let i = 0; i < sections.length; i++) {
                                const area = sections[i].width * sections[i].height;
                                if (area > largestArea) {
                                    largestArea = area;
                                    largestIndex = i;
                                }
                            }
                            
                            // Split the chosen section
                            const section = sections[largestIndex];
                            
                            // Choose split orientation based on section aspect ratio
                            const splitVertical = section.width > section.height;
                            
                            if (splitVertical) {
                                // Split vertically with random position
                                const splitPosition = section.width * (0.3 + Math.random() * 0.4); // 30-70% position
                                const gap = 20; // Gap between sections
                                
                                // Create two new sections
                                const leftSection = {
                                    x: section.x,
                                    y: section.y,
                                    width: splitPosition - gap/2,
                                    height: section.height
                                };
                                
                                const rightSection = {
                                    x: section.x + splitPosition + gap/2,
                                    y: section.y,
                                    width: section.width - splitPosition - gap/2,
                                    height: section.height
                                };
                                
                                // Replace the original section with the two new ones
                                sections.splice(largestIndex, 1, leftSection, rightSection);
                            } else {
                                // Split horizontally with random position
                                const splitPosition = section.height * (0.3 + Math.random() * 0.4); // 30-70% position
                                const gap = 20; // Gap between sections
                                
                                // Create two new sections
                                const topSection = {
                                    x: section.x,
                                    y: section.y,
                                    width: section.width,
                                    height: splitPosition - gap/2
                                };
                                
                                const bottomSection = {
                                    x: section.x,
                                    y: section.y + splitPosition + gap/2,
                                    width: section.width,
                                    height: section.height - splitPosition - gap/2
                                };
                                
                                // Replace the original section with the two new ones
                                sections.splice(largestIndex, 1, topSection, bottomSection);
                            }
                        }
                        
                        // If we have too many sections, remove the smallest ones
                        while (sections.length > count) {
                            let smallestIndex = 0;
                            let smallestArea = Infinity;
                            
                            for (let i = 0; i < sections.length; i++) {
                                const area = sections[i].width * sections[i].height;
                                if (area < smallestArea) {
                                    smallestArea = area;
                                    smallestIndex = i;
                                }
                            }
                            
                            sections.splice(smallestIndex, 1);
                        }
                    }
                    break;
            }
        }
        
        // Add some random rotation to sections (store rotation angle)
        return sections.map(section => {
            // Only add rotation for smaller sections and not in early levels
            const allowRotation = this.currentLevelNumber > 5 && 
                                 section.width < playableWidth * 0.6 &&
                                 section.height < playAreaHeight * 0.6;
                                 
            if (allowRotation && Math.random() < 0.3) {
                // Add slight rotation between -15 and 15 degrees
                const rotation = (Math.random() * 30 - 15) * Math.PI / 180;
                return {
                    ...section,
                    rotation: rotation
                };
            }
            
            return section;
        });
    }
    
    /**
     * Generate a specific pattern within a section
     */
    generatePatternInSection(patternFunc, section, pegSpacing, levelNumber) {
        // Calculate pattern center
        const centerX = section.x + section.width / 2;
        const centerY = section.y + section.height / 2;
        
        // Check if section has rotation
        const hasRotation = section.rotation !== undefined;
        
        // Generate different patterns based on their type
        let pegs = [];
        
        if (patternFunc === this.createGridPattern || 
            patternFunc === this.createCheckerboardPattern) {
            
            // For grid-based patterns - ensure they're centered in the section
            const cols = Math.floor(section.width / pegSpacing);
            const rows = Math.floor(section.height / pegSpacing);
            
            // Calculate exact start position to center the grid in the section
            const actualWidth = cols * pegSpacing;
            const actualHeight = rows * pegSpacing;
            const startX = centerX - (actualWidth / 2);
            const startY = centerY - (actualHeight / 2);
            
            pegs = patternFunc(
                startX, 
                startY, 
                cols, 
                rows, 
                pegSpacing,
                0.5 // Density factor
            );
            
        } else if (patternFunc === this.createDiamondPattern) {
            // For diamond pattern
            const radius = Math.min(section.width, section.height) * 0.45;
            
            pegs = patternFunc(centerX, centerY, radius, pegSpacing);
            
        } else if (patternFunc === this.createSpiralPattern ||
                  patternFunc === this.createVortexPattern) {
            
            // For spiral-like patterns
            const radius = Math.min(section.width, section.height) * 0.45;
            const turns = 2 + (levelNumber % 3);
            
            pegs = patternFunc(centerX, centerY, radius, turns, pegSpacing);
            
        } else if (patternFunc === this.createWavePattern) {
            // For wave pattern - ensure it fits properly in the section
            pegs = patternFunc(
                section.x, 
                section.y, 
                section.width, 
                section.height, 
                pegSpacing,
                2 + (levelNumber % 3) // Wave count
            );
            
        } else if (patternFunc === this.createTunnelPattern) {
            // For tunnel pattern
            pegs = patternFunc(
                centerX, 
                centerY, 
                Math.min(section.width, section.height) * 0.45, 
                pegSpacing,
                levelNumber % 2 === 0 // Alternate orientation
            );
            
        } else if (patternFunc === this.createRandomPattern) {
            // For random patterns - ensure they stay within the section boundaries
            const count = Math.floor((section.width * section.height) / (pegSpacing * pegSpacing) * 0.3);
            
            pegs = patternFunc(
                section.x + this.pegRadius * 2, 
                section.y + this.pegRadius * 2, 
                section.x + section.width - this.pegRadius * 2, 
                section.y + section.height - this.pegRadius * 2, 
                pegSpacing, 
                count
            );
            
        } else if (patternFunc === this.createClusteredPattern) {
            // For clustered patterns
            const clusterCount = 1 + Math.floor(levelNumber / 5);
            
            pegs = patternFunc(
                section.x, 
                section.y, 
                section.width, 
                section.height, 
                pegSpacing,
                clusterCount
            );
        } else if (patternFunc === this.createConcentricPattern) {
            // For concentric circles pattern
            const radius = Math.min(section.width, section.height) * 0.45;
            
            pegs = patternFunc(centerX, centerY, radius, pegSpacing);
        } else if (patternFunc === this.createZigzagPattern) {
            // For zigzag pattern
            const width = section.width;
            const height = section.height;
            
            pegs = patternFunc(section.x, section.y, width, height, pegSpacing);
        } else if (patternFunc === this.createHourglassPattern) {
            // For hourglass pattern
            const radius = Math.min(section.width, section.height) * 0.45;
            
            pegs = patternFunc(centerX, centerY, radius, pegSpacing);
        } else if (patternFunc === this.createMazePattern) {
            // For maze pattern
            const width = section.width;
            const height = section.height;
            
            pegs = patternFunc(section.x, section.y, width, height, pegSpacing);
        }
        
        // If the section has rotation, apply rotation to all pegs around the center
        if (hasRotation) {
            return pegs.map(peg => {
                // Translate relative to center
                const dx = peg.x - centerX;
                const dy = peg.y - centerY;
                
                // Rotate
                const cos = Math.cos(section.rotation);
                const sin = Math.sin(section.rotation);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;
                
                // Translate back
                return {
                    x: centerX + rotatedX,
                    y: centerY + rotatedY,
                    colorIndex: peg.colorIndex
                };
            });
        }
        
        return pegs;
    }
    
    /**
     * Select patterns appropriate for the current difficulty level
     */
    selectPatternsByDifficulty(difficultyFactor) {
        // Filter patterns based on difficulty
        return Object.keys(this.patterns).filter(pattern => {
            const patternDiff = this.patternDifficulty[pattern] || 5;
            return patternDiff <= difficultyFactor + 2;
        });
    }
    
    /**
     * Create a grid pattern of pegs
     */
    createGridPattern(startX, startY, columns, rows, pegSpacing, density = 1.0) {
        const pegs = [];
        
        // Get available colors for current level (pass through the levelNumber from calling context)
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                // Apply density factor
                if (Math.random() > density) continue;
                
                const x = startX + col * pegSpacing;
                const y = startY + row * pegSpacing;
                
                // Use available colors for this level
                const colorIndex = Math.floor(Math.random() * availableColors);
                
                pegs.push({ x, y, colorIndex });
            }
        }
        
        return pegs;
    }
    
    /**
     * Create a checkerboard pattern of pegs
     */
    createCheckerboardPattern(startX, startY, columns, rows, pegSpacing, density = 1.0) {
        const pegs = [];
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < columns; col++) {
                // Skip every other position for checkerboard effect
                if ((row + col) % 2 === 0 && Math.random() <= density) {
                    const x = startX + col * pegSpacing;
                    const y = startY + row * pegSpacing;
                    
                    // Use available colors for this level
                    const colorIndex = Math.floor(Math.random() * availableColors);
                    
                    pegs.push({ x, y, colorIndex });
                }
            }
        }
        
        return pegs;
    }
    
    /**
     * Create a diamond pattern of pegs
     */
    createDiamondPattern(centerX, centerY, radius, pegSpacing) {
        const pegs = [];
        const steps = Math.floor(radius / pegSpacing);
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        for (let i = -steps; i <= steps; i++) {
            const rowWidth = Math.floor((steps - Math.abs(i)) * 2);
            for (let j = -rowWidth / 2; j <= rowWidth / 2; j++) {
                const x = centerX + j * pegSpacing;
                const y = centerY + i * pegSpacing;
                
                // Use available colors for this level
                const colorIndex = Math.floor(Math.random() * availableColors);
                
                pegs.push({ x, y, colorIndex });
            }
        }
        
        return pegs;
    }
    
    /**
     * Create a spiral pattern of pegs
     */
    createSpiralPattern(centerX, centerY, radius, turns = 3, pegSpacing) {
        const pegs = [];
        const angleStep = pegSpacing / radius; // Angle between pegs
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        // Calculate how many pegs we need for the full spiral
        const maxAngle = turns * 2 * Math.PI;
        const steps = Math.floor(maxAngle / angleStep);
        
        for (let i = 0; i < steps; i++) {
            const angle = i * angleStep;
            const distance = (radius * angle) / maxAngle;
            
            if (distance >= radius) continue; // Skip if outside radius
            
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            // Use available colors for this level
            const colorIndex = Math.floor(Math.random() * availableColors);
            
            pegs.push({ x, y, colorIndex });
        }
        
        return pegs;
    }
    
    /**
     * Create a tunnel pattern (a corridor for the ball to travel through)
     */
    createTunnelPattern(centerX, centerY, radius, pegSpacing, horizontal = true) {
        const pegs = [];
        const steps = Math.floor(radius / pegSpacing);
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        // Create two parallel lines with a gap between them
        const gap = 3; // Gap width in peg spacings
        
        if (horizontal) {
            // Horizontal tunnel
            for (let i = -steps; i <= steps; i++) {
                // Top row
                pegs.push({
                    x: centerX + i * pegSpacing,
                    y: centerY - gap * pegSpacing / 2,
                    colorIndex: Math.floor(Math.random() * availableColors)
                });
                
                // Bottom row
                pegs.push({
                    x: centerX + i * pegSpacing,
                    y: centerY + gap * pegSpacing / 2,
                    colorIndex: Math.floor(Math.random() * availableColors)
                });
            }
        } else {
            // Vertical tunnel
            for (let i = -steps; i <= steps; i++) {
                // Left column
                pegs.push({
                    x: centerX - gap * pegSpacing / 2,
                    y: centerY + i * pegSpacing,
                    colorIndex: Math.floor(Math.random() * availableColors)
                });
                
                // Right column
                pegs.push({
                    x: centerX + gap * pegSpacing / 2,
                    y: centerY + i * pegSpacing,
                    colorIndex: Math.floor(Math.random() * availableColors)
                });
            }
        }
        
        return pegs;
    }
    
    /**
     * Create a wave pattern of pegs
     */
    createWavePattern(startX, startY, width, height, pegSpacing, waves = 3) {
        const pegs = [];
        const columns = Math.floor(width / pegSpacing);
        const rows = Math.floor(height / pegSpacing);
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        // Amplitude of the wave (in peg units)
        const amplitude = rows / 3;
        
        // Frequency of the wave
        const frequency = (Math.PI * waves) / columns;
        
        for (let col = 0; col < columns; col++) {
            // Calculate the wave y-position for this column
            const waveY = Math.sin(col * frequency) * amplitude;
            
            // Round to nearest peg position
            const pegRow = Math.round(rows / 2 + waveY);
            
            // Create a peg at the wave position
            const x = startX + col * pegSpacing;
            const y = startY + pegRow * pegSpacing;
            
            // Use available colors for this level
            const colorIndex = Math.floor(Math.random() * availableColors);
            
            pegs.push({ x, y, colorIndex });
            
            // Add some pegs above and below for thickness
            pegs.push({ 
                x, 
                y: y - pegSpacing,
                colorIndex: Math.floor(Math.random() * availableColors)
            });
            
            pegs.push({ 
                x, 
                y: y + pegSpacing,
                colorIndex: Math.floor(Math.random() * availableColors)
            });
        }
        
        return pegs;
    }
    
    /**
     * Create a vortex pattern (spiral with varying density)
     */
    createVortexPattern(centerX, centerY, radius, turns = 4, pegSpacing) {
        const pegs = [];
        const angleStep = pegSpacing / radius; // Angle between pegs
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        // Calculate how many pegs we need for the full spiral
        const maxAngle = turns * 2 * Math.PI;
        const steps = Math.floor(maxAngle / angleStep);
        
        // Create multiple spiral arms
        const arms = 3;
        
        for (let arm = 0; arm < arms; arm++) {
            const armOffset = (arm * 2 * Math.PI) / arms;
            
            for (let i = 0; i < steps; i++) {
                const angle = i * angleStep + armOffset;
                const distance = (radius * angle) / maxAngle;
                
                if (distance >= radius) continue; // Skip if outside radius
                
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                
                // Use arm index to determine color, ensuring each arm has a consistent color
                // but limited to available colors for this level
                const colorIndex = arm % availableColors;
                
                pegs.push({ x, y, colorIndex });
            }
        }
        
        return pegs;
    }
    
    /**
     * Create a random pattern of pegs
     */
    createRandomPattern(minX, minY, maxX, maxY, minDistance, count) {
        const pegs = [];
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        // Try to place the requested number of pegs
        let attempts = 0;
        const maxAttempts = count * 10; // Limit attempts to avoid infinite loop
        
        while (pegs.length < count && attempts < maxAttempts) {
            attempts++;
            
            // Generate random position
            const x = minX + Math.random() * (maxX - minX);
            const y = minY + Math.random() * (maxY - minY);
            
            // Check distance from other pegs
            let tooClose = false;
            
            for (const peg of pegs) {
                const dx = peg.x - x;
                const dy = peg.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                // Use available colors for this level
                const colorIndex = Math.floor(Math.random() * availableColors);
                
                pegs.push({ x, y, colorIndex });
            }
        }
        
        return pegs;
    }
    
    /**
     * Create a clustered pattern (groups of pegs)
     */
    createClusteredPattern(minX, minY, width, height, pegSpacing, clusterCount = 3) {
        const pegs = [];
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        // Generate cluster centers
        const clusters = [];
        for (let i = 0; i < clusterCount; i++) {
            clusters.push({
                x: minX + Math.random() * width,
                y: minY + Math.random() * height,
                // Each cluster has a primary color
                colorIndex: Math.floor(Math.random() * availableColors)
            });
        }
        
        // Number of pegs per cluster
        const pegsPerCluster = 15;
        
        // Generate pegs around each cluster center
        for (const cluster of clusters) {
            // Create a dense group at the center
            const clusterRadius = pegSpacing * 3;
            
            for (let i = 0; i < pegsPerCluster; i++) {
                // Random position with higher density toward center
                const angle = Math.random() * Math.PI * 2;
                const distance = clusterRadius * Math.pow(Math.random(), 0.5); // Square root for better distribution
                
                const x = cluster.x + Math.cos(angle) * distance;
                const y = cluster.y + Math.sin(angle) * distance;
                
                // Use cluster's color with high probability, but ensure within available colors
                const colorIndex = Math.random() < 0.7 ? 
                    cluster.colorIndex : 
                    Math.floor(Math.random() * availableColors);
                
                pegs.push({ x, y, colorIndex });
            }
        }
        
        // Remove any overlapping pegs
        return this.removePegOverlaps(pegs, pegSpacing * 0.8);
    }
    
    /**
     * Create a concentric circles pattern
     */
    createConcentricPattern(centerX, centerY, radius, pegSpacing) {
        const pegs = [];
        const rings = Math.floor(radius / pegSpacing);
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        for (let r = 1; r <= rings; r++) {
            const ringRadius = r * pegSpacing;
            const circumference = 2 * Math.PI * ringRadius;
            const pegCount = Math.floor(circumference / pegSpacing);
            
            for (let i = 0; i < pegCount; i++) {
                const angle = (i / pegCount) * 2 * Math.PI;
                const x = centerX + Math.cos(angle) * ringRadius;
                const y = centerY + Math.sin(angle) * ringRadius;
                
                // Alternate colors by ring, bounded by available colors
                const colorIndex = r % availableColors;
                
                pegs.push({ x, y, colorIndex });
            }
        }
        
        return pegs;
    }
    
    /**
     * Create a zigzag pattern
     */
    createZigzagPattern(startX, startY, width, height, pegSpacing) {
        const pegs = [];
        const columns = Math.floor(width / pegSpacing);
        const zigzagHeight = 3 * pegSpacing; // Height of each zigzag
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        for (let col = 0; col < columns; col++) {
            const x = startX + col * pegSpacing;
            // Calculate zigzag pattern
            const zigzagOffset = col % 2 === 0 ? 0 : zigzagHeight / 2;
            
            // Place pegs along the vertical line with a zigzag pattern
            for (let row = 0; row * zigzagHeight < height; row++) {
                const baseY = startY + row * zigzagHeight;
                const y = baseY + zigzagOffset;
                
                // Alternate colors within available colors
                const colorIndex = (col + row) % availableColors;
                
                pegs.push({ x, y, colorIndex });
            }
        }
        
        return pegs;
    }
    
    /**
     * Create an hourglass pattern
     */
    createHourglassPattern(centerX, centerY, radius, pegSpacing) {
        const pegs = [];
        const maxRows = Math.floor(radius / pegSpacing);
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        for (let row = -maxRows; row <= maxRows; row++) {
            // Calculate width at this row (narrow in the middle)
            const rowFraction = Math.abs(row) / maxRows;
            const rowWidth = Math.max(1, Math.floor(rowFraction * maxRows));
            
            for (let col = -rowWidth; col <= rowWidth; col++) {
                const x = centerX + col * pegSpacing;
                const y = centerY + row * pegSpacing;
                
                // Use position-based color, bounded by available colors
                const colorIndex = (Math.abs(row) + Math.abs(col)) % availableColors;
                
                pegs.push({ x, y, colorIndex });
            }
        }
        
        return pegs;
    }
    
    /**
     * Create a simple maze-like pattern
     */
    createMazePattern(startX, startY, width, height, pegSpacing) {
        const pegs = [];
        const cols = Math.floor(width / pegSpacing);
        const rows = Math.floor(height / pegSpacing);
        const availableColors = this.getAvailableColors(this.currentLevelNumber || 1);
        
        // Create a grid to track where walls are
        const grid = Array(rows).fill().map(() => Array(cols).fill(false));
        
        // Create maze walls using a simple algorithm
        for (let row = 0; row < rows; row += 2) {
            for (let col = 0; col < cols; col += 2) {
                grid[row][col] = true;
                
                // Create random walls
                const directions = [
                    [row + 1, col], // Down
                    [row, col + 1]  // Right
                ].filter(([r, c]) => r < rows && c < cols);
                
                if (directions.length > 0 && Math.random() < 0.7) {
                    const [wallRow, wallCol] = directions[Math.floor(Math.random() * directions.length)];
                    grid[wallRow][wallCol] = true;
                }
            }
        }
        
        // Convert grid to pegs
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (grid[row][col]) {
                    const x = startX + col * pegSpacing;
                    const y = startY + row * pegSpacing;
                    
                    // Use position-based color, bounded by available colors
                    const colorIndex = (row + col) % availableColors;
                    
                    pegs.push({ x, y, colorIndex });
                }
            }
        }
        
        return pegs;
    }
    
    /**
     * Get color thresholds for a level
     * These determine how many pegs of each color need to be hit
     */
    getColorThresholds(levelNumber) {
        // Get available colors for this level
        const availableColors = this.getAvailableColors(levelNumber);
        
        // Base thresholds start at 25% for early levels
        const baseThreshold = 0.25;
        
        // More aggressive scaling for higher levels
        // Level 1-5: 25% to 40%
        // Level 6-10: 40% to 55%
        // Level 11-15: 55% to 70%
        // Level 16+: 70% to 80%
        let scaledThreshold;
        
        if (levelNumber <= 5) {
            // Early levels: gentle progression from 25% to 40%
            scaledThreshold = baseThreshold + ((levelNumber - 1) / 4) * 0.15;
        } else if (levelNumber <= 10) {
            // Mid levels: 40% to 55%
            scaledThreshold = 0.40 + ((levelNumber - 6) / 4) * 0.15;
        } else if (levelNumber <= 15) {
            // Advanced levels: 55% to 70%
            scaledThreshold = 0.55 + ((levelNumber - 11) / 4) * 0.15;
        } else {
            // Expert levels: 70% to 80% (capped to keep game playable)
            scaledThreshold = Math.min(0.80, 0.70 + ((levelNumber - 16) / 10) * 0.10);
        }
        
        // Generate thresholds with some randomness
        const thresholds = Array(8).fill(0);
        
        for (let i = 0; i < availableColors; i++) {
            // Apply varying thresholds for different colors to increase challenge
            // Key colors (first few colors) have slightly higher thresholds
            let colorVariation = 0;
            
            if (levelNumber > 3) {
                // Add color-specific variations in higher levels
                if (i === 0) colorVariation = 0.05; // First color slightly higher
                else if (i === availableColors - 1) colorVariation = -0.03; // Last color slightly lower
                
                // Add small random variation (smaller than before to keep game fair)
                const randomVariation = (Math.random() * 0.06) - 0.03; // ±3% random variation
                colorVariation += randomVariation;
            }
            
            // Calculate final threshold with base + level scaling + color variation
            thresholds[i] = Math.min(0.85, Math.max(0.2, scaledThreshold + colorVariation));
        }
        
        console.log(`Level ${levelNumber} thresholds:`, thresholds.slice(0, availableColors));
        return thresholds;
    }
}

export default LevelGenerator; 