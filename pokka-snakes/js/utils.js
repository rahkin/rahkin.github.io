const Utils = {
    // Vector operations
    distance: (x1, y1, x2, y2) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    angle: (x1, y1, x2, y2) => {
        return Math.atan2(y2 - y1, x2 - x1);
    },
    
    lerp: (start, end, t) => {
        return start + (end - start) * t;
    },
    
    clamp: (value, min, max) => {
        return Math.min(Math.max(value, min), max);
    },
    
    // Random number generation
    random: (min, max) => {
        return Math.random() * (max - min) + min;
    },
    
    randomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    randomColor: () => {
        const colors = [
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
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },
    
    // Collision detection
    circleCollision: (x1, y1, r1, x2, y2, r2) => {
        return Utils.distance(x1, y1, x2, y2) < (r1 + r2);
    },
    
    pointInRect: (px, py, rx, ry, rw, rh) => {
        return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
    },
    
    // Camera and viewport
    worldToScreen: (x, y, camera) => {
        return {
            x: (x - camera.x) * camera.zoom + window.innerWidth / 2,
            y: (y - camera.y) * camera.zoom + window.innerHeight / 2
        };
    },
    
    screenToWorld: (x, y, camera) => {
        return {
            x: (x - window.innerWidth / 2) / camera.zoom + camera.x,
            y: (y - window.innerHeight / 2) / camera.zoom + camera.y
        };
    },
    
    // Performance optimization
    throttle: (func, limit) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // String manipulation
    truncateString: (str, maxLength) => {
        if (str.length <= maxLength) return str;
        return str.slice(0, maxLength - 3) + '...';
    },
    
    // Array operations
    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },
    
    // Color manipulation
    adjustColorBrightness: (color, factor) => {
        const hex = color.replace('#', '');
        const r = Math.min(255, Math.floor(parseInt(hex.substr(0, 2), 16) * factor));
        const g = Math.min(255, Math.floor(parseInt(hex.substr(2, 2), 16) * factor));
        const b = Math.min(255, Math.floor(parseInt(hex.substr(4, 2), 16) * factor));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    },
    
    // Game state helpers
    calculateRank: (playerLength, allSnakes) => {
        const sortedLengths = allSnakes.map(snake => snake.length).sort((a, b) => b - a);
        return sortedLengths.indexOf(playerLength) + 1;
    },
    
    // Bot AI helpers
    calculateAttraction: (bot, target, weight, maxDistance) => {
        const dist = Utils.distance(bot.x, bot.y, target.x, target.y);
        if (dist > maxDistance) return { x: 0, y: 0 };
        
        const factor = (1 - dist / maxDistance) * weight;
        const angle = Utils.angle(bot.x, bot.y, target.x, target.y);
        return {
            x: Math.cos(angle) * factor,
            y: Math.sin(angle) * factor
        };
    },
    
    // Debug helpers
    drawDebugInfo: (ctx, game) => {
        if (!game.debug) return;
        
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        
        // Draw FPS
        ctx.fillText(`FPS: ${Math.round(game.fps)}`, 10, 20);
        
        // Draw entity count
        ctx.fillText(`Snakes: ${game.snakes.length}`, 10, 40);
        ctx.fillText(`Pellets: ${game.pellets.length}`, 10, 60);
        
        // Draw player info
        if (game.player) {
            ctx.fillText(`Length: ${Math.round(game.player.length)}`, 10, 80);
            ctx.fillText(`Position: (${Math.round(game.player.x)}, ${Math.round(game.player.y)})`, 10, 100);
        }
        
        ctx.restore();
    }
}; 