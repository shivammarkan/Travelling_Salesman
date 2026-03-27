/** 
 * Travelling Salesman Problem Interactive Explorer 
 * Implementation: Antigravity AI
 */

class TSPApp {
    constructor() {
        this.cities = [];
        this.currentPath = [];
        this.canvas = document.getElementById('tsp-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isSolving = false;
        
        // UI Elements
        this.elements = {
            modeToggle: document.getElementById('mode-toggle'),
            algorithmSelect: document.getElementById('algorithm-select'),
            solveBtn: document.getElementById('solve-btn'),
            clearBtn: document.getElementById('clear-btn'),
            randomBtn: document.getElementById('random-btn'),
            statDistance: document.getElementById('stat-distance'),
            statCities: document.getElementById('stat-cities'),
            statStatus: document.getElementById('stat-status')
        };

        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();

        // Event Listeners
        this.canvas.addEventListener('mousedown', (e) => this.addCity(e));
        this.elements.modeToggle.addEventListener('click', () => this.toggleTheme());
        this.elements.solveBtn.addEventListener('click', () => this.solve());
        this.elements.clearBtn.addEventListener('click', () => this.clearAll());
        this.elements.randomBtn.addEventListener('click', () => this.generateRandomCities(10));

        // Load Theme
        const savedTheme = localStorage.getItem('tsp-theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);

        this.animate();
    }

    resizeCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.draw();
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', nextTheme);
        localStorage.setItem('tsp-theme', nextTheme);
        this.updateThemeButton(nextTheme);
        this.draw();
    }

    updateThemeButton(theme) {
        this.elements.modeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    addCity(e) {
        if (this.isSolving) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.cities.push({x, y});
        this.currentPath = [...Array(this.cities.length).keys()];
        this.updateStats();
        this.draw();
    }

    generateRandomCities(count) {
        if (this.isSolving) return;
        this.clearAll();
        const padding = 50;
        for (let i = 0; i < count; i++) {
            this.cities.push({
                x: padding + Math.random() * (this.canvas.width - padding * 2),
                y: padding + Math.random() * (this.canvas.height - padding * 2)
            });
        }
        this.currentPath = [...Array(this.cities.length).keys()];
        this.updateStats();
        this.draw();
    }

    clearAll() {
        if (this.isSolving) return;
        this.cities = [];
        this.currentPath = [];
        this.updateStats();
        this.draw();
    }

    getDistance(path) {
        let d = 0;
        for (let i = 0; i < path.length; i++) {
            const c1 = this.cities[path[i]];
            const c2 = this.cities[path[(i + 1) % path.length]];
            d += Math.sqrt(Math.pow(c2.x - c1.x, 2) + Math.pow(c2.y - c1.y, 2));
        }
        return d;
    }

    updateStats(status = "Idle") {
        const dist = this.cities.length > 1 ? this.getDistance(this.currentPath) : 0;
        this.elements.statDistance.textContent = `${dist.toFixed(2)} px`;
        this.elements.statCities.textContent = this.cities.length;
        this.elements.statStatus.textContent = status;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const style = getComputedStyle(document.body);
        const nodeColor = style.getPropertyValue('--node-color').trim();
        const edgeColor = style.getPropertyValue('--edge-color').trim();
        const textColor = style.getPropertyValue('--text-primary').trim();

        // Draw Edges
        if (this.currentPath.length > 1) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = edgeColor;
            this.ctx.lineWidth = 2;
            const startCity = this.cities[this.currentPath[0]];
            this.ctx.moveTo(startCity.x, startCity.y);
            
            for (let i = 1; i < this.currentPath.length; i++) {
                const city = this.cities[this.currentPath[i]];
                this.ctx.lineTo(city.x, city.y);
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }

        // Draw Nodes
        this.cities.forEach((city, i) => {
            this.ctx.beginPath();
            this.ctx.arc(city.x, city.y, 6, 0, Math.PI * 2);
            this.ctx.fillStyle = nodeColor;
            this.ctx.fill();
            this.ctx.strokeStyle = textColor;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();

            // City Index (for educational clarity)
            this.ctx.fillStyle = textColor;
            this.ctx.font = '10px sans-serif';
            this.ctx.fillText(i + 1, city.x + 10, city.y - 10);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        // Simple draw call or we could add animations here
    }

    async solve() {
        if (this.isSolving || this.cities.length < 2) return;
        this.isSolving = true;
        const algo = this.elements.algorithmSelect.value;
        
        if (algo === 'brute-force') {
            if (this.cities.length > 9) {
                alert("Brute force on more than 9 cities will be extremely slow. Try a heuristic!");
                this.isSolving = false;
                return;
            }
            await this.solveBruteForce();
        } else if (algo === 'nearest-neighbour') {
            await this.solveNearestNeighbour();
        } else if (algo === 'two-opt') {
            await this.solveTwoOpt();
        } else {
            alert("Please select an algorithm first!");
        }

        this.isSolving = false;
        this.updateStats("Completed");
    }

    // --- ALGORITHMS ---

    async solveNearestNeighbour() {
        this.updateStats("Solving...");
        let path = [0];
        let unvisited = [...Array(this.cities.length).keys()].slice(1);

        while (unvisited.length > 0) {
            let last = this.cities[path[path.length - 1]];
            let nearestIdx = -1;
            let minDist = Infinity;

            for (let i = 0; i < unvisited.length; i++) {
                const cityIdx = unvisited[i];
                const city = this.cities[cityIdx];
                const d = Math.sqrt(Math.pow(city.x - last.x, 2) + Math.pow(city.y - last.y, 2));
                if (d < minDist) {
                    minDist = d;
                    nearestIdx = i;
                }
            }

            path.push(unvisited[nearestIdx]);
            unvisited.splice(nearestIdx, 1);
            
            // Educational Visualization Delay
            this.currentPath = [...path];
            this.draw();
            this.updateStats("Seeking...");
            await new Promise(r => setTimeout(r, 100));
        }

        this.currentPath = path;
    }

    async solveBruteForce() {
        this.updateStats("Exhausting permutations...");
        let bestDist = Infinity;
        let bestPath = [];
        const indices = [...Array(this.cities.length).keys()];

        const permutations = (arr) => {
            if (arr.length <= 1) return [arr];
            let perms = [];
            for (let i = 0; i < arr.length; i++) {
                const rest = permutations([...arr.slice(0, i), ...arr.slice(i + 1)]);
                for (let r of rest) {
                    perms.push([arr[i], ...r]);
                }
            }
            return perms;
        };

        const allPerms = permutations(indices);
        
        for (let p of allPerms) {
            const d = this.getDistance(p);
            if (d < bestDist) {
                bestDist = d;
                bestPath = p;
                this.currentPath = bestPath;
                this.draw();
                this.updateStats("Found shorter path...");
                await new Promise(r => setTimeout(r, 10));
            }
        }
        this.currentPath = bestPath;
    }

    async solveTwoOpt() {
        this.updateStats("Optimising 2-Opt...");
        // Start with current or greedy path if empty
        if (this.currentPath.length < this.cities.length) {
            await this.solveNearestNeighbour();
        }

        let improved = true;
        while (improved) {
            improved = false;
            for (let i = 0; i < this.currentPath.length - 1; i++) {
                for (let j = i + 1; j < this.currentPath.length; j++) {
                    const newPath = this.twoOptSwap(this.currentPath, i, j);
                    const newDist = this.getDistance(newPath);
                    if (newDist < this.getDistance(this.currentPath)) {
                        this.currentPath = newPath;
                        improved = true;
                        this.draw();
                        this.updateStats("Uncrossing...");
                        await new Promise(r => setTimeout(r, 50));
                    }
                }
            }
        }
    }

    twoOptSwap(path, i, j) {
        const newPath = path.slice(0, i);
        const reversedMiddle = path.slice(i, j + 1).reverse();
        const end = path.slice(j + 1);
        return [...newPath, ...reversedMiddle, ...end];
    }
}

// Instantiate
window.addEventListener('scroll', () => {}); // placeholder
document.addEventListener('DOMContentLoaded', () => {
    window.tspApp = new TSPApp();
});
