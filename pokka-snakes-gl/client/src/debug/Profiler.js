export class Profiler {
    constructor() {
        this.profiles = new Map();
        this.activeProfiles = new Map();
        this.enabled = false;
        this.history = new Map();
        this.historySize = 100;
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
        this.profiles.clear();
        this.activeProfiles.clear();
    }

    start(label) {
        if (!this.enabled) return;

        if (this.activeProfiles.has(label)) {
            console.warn(`Profile '${label}' already started`);
            return;
        }

        this.activeProfiles.set(label, performance.now());
    }

    end(label) {
        if (!this.enabled) return;

        const startTime = this.activeProfiles.get(label);
        if (!startTime) {
            console.warn(`No active profile for '${label}'`);
            return;
        }

        const duration = performance.now() - startTime;
        this.activeProfiles.delete(label);

        if (!this.profiles.has(label)) {
            this.profiles.set(label, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: -Infinity,
                average: 0
            });
        }

        const profile = this.profiles.get(label);
        profile.count++;
        profile.totalTime += duration;
        profile.minTime = Math.min(profile.minTime, duration);
        profile.maxTime = Math.max(profile.maxTime, duration);
        profile.average = profile.totalTime / profile.count;

        // Update history
        if (!this.history.has(label)) {
            this.history.set(label, []);
        }
        const history = this.history.get(label);
        history.push(duration);
        if (history.length > this.historySize) {
            history.shift();
        }
    }

    wrap(label, fn) {
        if (!this.enabled) return fn();

        this.start(label);
        try {
            return fn();
        } finally {
            this.end(label);
        }
    }

    async wrapAsync(label, fn) {
        if (!this.enabled) return fn();

        this.start(label);
        try {
            return await fn();
        } finally {
            this.end(label);
        }
    }

    getProfile(label) {
        return this.profiles.get(label);
    }

    getAllProfiles() {
        return Array.from(this.profiles.entries()).map(([label, profile]) => ({
            label,
            ...profile,
            history: this.history.get(label) || []
        }));
    }

    clear() {
        this.profiles.clear();
        this.activeProfiles.clear();
        this.history.clear();
    }

    generateReport() {
        if (!this.enabled) return '';

        let report = 'Performance Profile Report\n';
        report += '========================\n\n';

        this.profiles.forEach((profile, label) => {
            report += `${label}:\n`;
            report += `-----------------\n`;
            report += `Count: ${profile.count}\n`;
            report += `Total Time: ${profile.totalTime.toFixed(2)}ms\n`;
            report += `Average Time: ${profile.average.toFixed(2)}ms\n`;
            report += `Min Time: ${profile.minTime.toFixed(2)}ms\n`;
            report += `Max Time: ${profile.maxTime.toFixed(2)}ms\n`;
            report += `Standard Deviation: ${this.calculateStandardDeviation(label).toFixed(2)}ms\n\n`;
        });

        return report;
    }

    calculateStandardDeviation(label) {
        const history = this.history.get(label);
        if (!history || history.length === 0) return 0;

        const mean = history.reduce((sum, value) => sum + value, 0) / history.length;
        const squareDiffs = history.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((sum, value) => sum + value, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }

    getProfileGraph(label) {
        const history = this.history.get(label);
        if (!history) return null;

        return {
            data: history,
            average: history.reduce((sum, value) => sum + value, 0) / history.length,
            standardDeviation: this.calculateStandardDeviation(label)
        };
    }

    exportProfiles() {
        return {
            timestamp: new Date().toISOString(),
            profiles: this.getAllProfiles()
        };
    }

    importProfiles(data) {
        this.clear();
        data.profiles.forEach(profile => {
            this.profiles.set(profile.label, {
                count: profile.count,
                totalTime: profile.totalTime,
                minTime: profile.minTime,
                maxTime: profile.maxTime,
                average: profile.average
            });
            this.history.set(profile.label, profile.history);
        });
    }
} 