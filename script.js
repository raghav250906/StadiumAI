document.addEventListener('DOMContentLoaded', () => {
    // --- Cached DOM Elements ---
    const checkBtn = document.getElementById('check-btn');
    const currentLocation = document.getElementById('current-location');
    const destination = document.getElementById('destination');
    const resultCard = document.getElementById('result-card');
    
    const crowdLevelEl = document.getElementById('crowd-level');
    const waitTimeEl = document.getElementById('wait-time');
    const routeTextEl = document.getElementById('route-text');
    const stadiumMap = document.getElementById('stadium-map');
    const routeSvg = document.getElementById('route-svg');
    const notificationContainer = document.getElementById('notification-container');

    // --- Global Zone Data for Crowd Visualization ---
    const zones = [
        { id: 'zone-gate-a', name: 'Gate A' },
        { id: 'zone-gate-b', name: 'Gate B' },
        { id: 'zone-gate-c', name: 'Gate C' },
        { id: 'zone-food-court', name: 'Food Court' },
        { id: 'zone-restrooms', name: 'Restrooms' },
        { id: 'zone-merchandise', name: 'Merchandise' },
        { id: 'zone-section-101', name: 'Section 101' },
    ];
    
    // Pre-cache DOM elements for each zone to improve efficiency
    zones.forEach(zone => {
        zone.element = document.getElementById(zone.id);
    });

    const zoneData = {};

    /**
     * Initializes all stadium zones with random crowd densities and updates 3D map colors
     */
    function initializeCrowd() {
        zones.forEach(zone => {
            const density = Math.floor(Math.random() * 101);
            let level = 'low';
            if (density >= 75) level = 'high';
            else if (density >= 35) level = 'medium';

            zoneData[zone.name] = { density, level };

            const el = zone.element;
            if (el) {
                // Update CSS classes for 3D block colors
                el.classList.remove('low', 'medium', 'high');
                el.classList.add(level);
                
                // Update 3D tooltip info
                const tooltipSpan = el.querySelector('.tt-info');
                if (tooltipSpan) {
                    const wait = Math.floor(density * 0.2) + 2;
                    tooltipSpan.innerHTML = `Crowd: ${density}%<br>Est. Wait: ~${wait}m`;
                }
            }
        });
    }

    // --- Mock Firebase Simulation ---
    /**
     * Simulates receiving real-time cloud data updates via Firebase/WebSockets.
     * Randomly adjusts crowd levels across the stadium periodically.
     */
    function simulateLiveUpdates() {
        setInterval(() => {
            // Update the crowd data for a live feel
            initializeCrowd();
            // Note: In a real production app, this would be replaced with:
            // firebase.database().ref('stadium/zones').on('value', (snapshot) => { ... })
        }, 8000); // Poll every 8 seconds
    }

    // Initialize and start cloud simulation
    initializeCrowd();
    simulateLiveUpdates();

    // --- Camera Control Logic ---
    /**
     * Pans the 3D map camera to a specific location
     * @param {string} locationName 
     */
    function focusCameraOn(locationName) {
        if (!locationName) return;
        const formatted = locationName.toLowerCase().replace(' ', '-');
        stadiumMap.className = '';
        stadiumMap.classList.add(`view-${formatted}`);
    }

    currentLocation.addEventListener('change', (e) => focusCameraOn(e.target.value));
    destination.addEventListener('change', (e) => focusCameraOn(e.target.value));

    // --- Route Drawing Logic ---
    const coords = {
        'Gate A': { x: 80, y: 320 },
        'Gate B': { x: 200, y: 320 },
        'Gate C': { x: 320, y: 320 },
        'Food Court': { x: 320, y: 80 },
        'Restrooms': { x: 80, y: 80 },
        'Merchandise': { x: 40, y: 200 },
        'Section 101': { x: 360, y: 200 }
    };

    /**
     * Draws an animated SVG path on the 3D map
     */
    function drawRoute(start, end, isAlternate) {
        routeSvg.innerHTML = '';
        if (!coords[start] || !coords[end]) return;

        const p1 = coords[start];
        const p2 = coords[end];

        let pathD = '';
        if (isAlternate) {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            
            let nx = -dy, ny = dx;
            const length = Math.sqrt(nx*nx + ny*ny);
            if (length > 0) { nx /= length; ny /= length; }
            
            if ((nx * (midX - 200) + ny * (midY - 200)) < 0) {
                nx = -nx; ny = -ny;
            }
            
            const controlX = midX + nx * 120;
            const controlY = midY + ny * 120;
            pathD = `M ${p1.x} ${p1.y} Q ${controlX} ${controlY} ${p2.x} ${p2.y}`;
        } else {
            pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
        }

        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', pathD);
        pathElement.setAttribute('class', `route-path ${isAlternate ? 'alternate' : ''}`);
        routeSvg.appendChild(pathElement);
    }

    // --- Core Routing & AI Logic ---

    /**
     * Validates user inputs for safe routing
     * @returns {boolean} True if inputs are valid
     */
    function validateInputs(start, end) {
        if (!start || !end) {
            showNotification('❌ Please select both a current location and a destination.');
            return false;
        }
        if (start === end) {
            showNotification('📍 You are already at your destination!');
            return false;
        }
        
        // Strict validation against known zones
        const validNames = zones.map(z => z.name);
        if (!validNames.includes(start) || !validNames.includes(end)) {
            showNotification('⚠️ Invalid zone selected. Please try again.');
            return false;
        }
        return true;
    }

    /**
     * Calculates the crowd metrics and generates an AI routing suggestion
     * @returns {Object} Routing logic data
     */
    function getCrowdLevel(start, end) {
        const destData = zoneData[end] || { density: 10, level: 'low' };
        const density = destData.density;
        const crowdLevel = destData.level.charAt(0).toUpperCase() + destData.level.slice(1);
        
        let routeSuggestion = '';
        let baseWaitTime = 0;
        let isAlternate = false;

        // Routing Logic Rules Engine
        if (density >= 75) {
            isAlternate = true;
            baseWaitTime = Math.floor(density * 0.3) + 5;
            routeSuggestion = `🚨 Severe Congestion (${density}% density): The main route from ${start} to ${end} is packed. Suggestion: Take the exterior alternative route to save time.`;
        } else if (density >= 35) {
            baseWaitTime = Math.floor(density * 0.15) + 2;
            routeSuggestion = `⚠️ Warning: Moderate crowding (${density}% density) between ${start} and ${end}. You can take the main path, but expect minor delays.`;
        } else {
            baseWaitTime = Math.floor((density / 35) * 4) + 1;
            routeSuggestion = `✅ Fastest Route Available: The path from ${start} to ${end} is clear (${density}% density). Take the direct route now!`;
        }

        return { density, crowdLevel, baseWaitTime, routeSuggestion, isAlternate };
    }

    /**
     * Updates the UI state with new routing data
     */
    function updateUI(start, end, data) {
        crowdLevelEl.textContent = `${data.crowdLevel} (${data.density}%)`;
        crowdLevelEl.className = `value ${data.crowdLevel.toLowerCase()}`;
        waitTimeEl.textContent = `~${data.baseWaitTime} mins`;
        routeTextEl.textContent = data.routeSuggestion;
        
        // Highlight Selected Zones efficiently using cached elements
        zones.forEach(z => {
            if (z.element) z.element.classList.remove('selected-zone');
        });
        const startZone = zones.find(z => z.name === start);
        const endZone = zones.find(z => z.name === end);
        if (startZone && startZone.element) startZone.element.classList.add('selected-zone');
        if (endZone && endZone.element) endZone.element.classList.add('selected-zone');
        
        drawRoute(start, end, data.isAlternate);
        focusCameraOn(end);
    }

    // Main event handler
    checkBtn.addEventListener('click', () => {
        const start = currentLocation.value;
        const end = destination.value;

        if (!validateInputs(start, end)) return;

        const originalText = checkBtn.textContent;
        checkBtn.classList.add('loading');
        checkBtn.innerHTML = '<span class="spinner"></span> Calculating...';
        checkBtn.disabled = true;

        setTimeout(() => {
            try {
                // Execute modularized routing pipeline
                const routeData = getCrowdLevel(start, end);
                updateUI(start, end, routeData);
                
                if (resultCard.classList.contains('hidden')) {
                    resultCard.classList.remove('hidden');
                } else {
                    resultCard.style.animation = 'none';
                    resultCard.offsetHeight; // reflow
                    resultCard.style.animation = null; 
                }
            } catch (error) {
                console.error('Routing Error:', error);
                showNotification('⚠️ An error occurred while calculating your route.');
            } finally {
                checkBtn.classList.remove('loading');
                checkBtn.textContent = originalText;
                checkBtn.disabled = false;
            }
        }, 1200);
    });

    // --- Advanced Features ---
    const foodBtn = document.getElementById('food-btn');
    const emergencyBtn = document.getElementById('emergency-btn');

    foodBtn.addEventListener('click', () => {
        const stalls = ['Burger Spot', 'Pizza Express', 'Taco Stand', 'Hot Dog Cart'];
        const randomStall = stalls[Math.floor(Math.random() * stalls.length)];
        const waitTime = Math.floor(Math.random() * 15) + 5;
        showNotification(`🍔 Nearest: ${randomStall}. Est. wait: ${waitTime} mins.`);
        focusCameraOn('Food Court');
    });

    emergencyBtn.addEventListener('click', () => {
        showNotification(`🚨 Emergency Alert sent! Security dispatched to your location. Stay calm.`);
    });

    /**
     * Displays a temporary toast notification on the screen.
     * @param {string} message - The text message to display
     */
    function showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.textContent = message;
        notificationContainer.appendChild(notif);

        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => notif.remove(), 300);
        }, 4000);
    }

    // --- Micro-Interactions ---
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const x = e.clientX - e.target.getBoundingClientRect().left;
            const y = e.clientY - e.target.getBoundingClientRect().top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
});
