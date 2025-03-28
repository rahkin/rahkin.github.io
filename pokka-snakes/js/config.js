const CONFIG = {
    // World settings
    WORLD_WIDTH: 1600,
    WORLD_HEIGHT: 900,
    GRID_SIZE: 40,
    GRID_COLOR: 'rgba(255, 255, 255, 0.1)',
    BACKGROUND_COLOR: '#000000',

    // Game settings
    INITIAL_BOT_COUNT: 5,
    MIN_BOT_COUNT: 3,
    INITIAL_PELLET_COUNT: 100,
    MIN_PELLET_COUNT: 50,
    MAX_HIGH_SCORES: 10,
    MAX_NAME_LENGTH: 15,
    DEBUG: true,
    DEBUG_COLLISIONS: true,
    DEBUG_CAMERA: true,
    DEBUG_PERFORMANCE: true,

    // Performance settings
    PIXEL_RATIO: window.devicePixelRatio || 1,
    RENDER_MARGIN: 100,
    BOT_DECISION_INTERVAL: 100,

    // Snake settings
    INITIAL_SNAKE_LENGTH: 10,
    BASE_SPEED: 2.0,
    BOOST_SPEED: 4.0,
    TURNING_RADIUS: 2.5,
    HEAD_HITBOX_RADIUS: 12,
    BODY_HITBOX_RADIUS: 10,
    MIN_SNAKE_PARTS_SPACING: 4,
    BOOST_LENGTH_LOSS_RATE: 0.3,
    SNAKE_GLOW: true,

    // Pellet settings
    PELLET_SIZE: 5,
    PELLET_GROWTH_AMOUNT: 2,
    PELLET_PULSE_SPEED: 5,
    PELLET_PULSE_AMOUNT: 0.2,
    PELLET_GLOW: true,

    // Camera settings
    MIN_ZOOM: 0.5,
    MAX_ZOOM: 2,
    CAMERA_SMOOTHING: 0.92,

    // Bot AI settings
    BOT_THREAT_DISTANCE: 150,
    BOT_FLEE_DISTANCE: 200,
    BOT_WANDER_DISTANCE: 300,
    BOT_WANDER_CHANGE_CHANCE: 0.1,
    BOT_STATE_CHANGE_TIME: 5000,
    BOT_STATE_CHANGE_CHANCE: 0.3,

    // Colors
    COLORS: [
        '#FF0000', // Red
        '#00FF00', // Green
        '#0000FF', // Blue
        '#FFFF00', // Yellow
        '#FF00FF', // Magenta
        '#00FFFF', // Cyan
        '#FF8000', // Orange
        '#8000FF', // Purple
        '#0080FF', // Light Blue
        '#FF0080'  // Pink
    ]
}; 