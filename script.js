document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const checkBtn = document.getElementById('check-btn');
    const currentLocation = document.getElementById('current-location');
    const destination = document.getElementById('destination');
    const resultCard = document.getElementById('result-card');
    
    const crowdLevelEl = document.getElementById('crowd-level');
    const waitTimeEl = document.getElementById('wait-time');
    const routeTextEl = document.getElementById('route-text');
    const stadiumMap = document.getElementById('stadium-map');

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

            const el = document.getElementById(zone.id);
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

    // Call on load to paint the 3D map
    initializeCrowd();

    // --- Camera Control Logic ---
    function focusCameraOn(locationName) {
        if (!locationName) return;
        const formatted = locationName.toLowerCase().replace(' ', '-');
        
        // Remove all view classes and apply the new one to pan the 3D map
        stadiumMap.className = '';
        stadiumMap.classList.add(`view-${formatted}`);
    }

    // Pan camera on input change
    currentLocation.addEventListener('change', (e) => focusCameraOn(e.target.value));
    destination.addEventListener('change', (e) => focusCameraOn(e.target.value));

    // --- Route Drawing Logic ---
    const routeSvg = document.getElementById('route-svg');

    // Define coords for each zone (matches top/left % in 400x400 container)
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
        // Clear previous routes
        routeSvg.innerHTML = '';

        if (!coords[start] || !coords[end]) return;

        const p1 = coords[start];
        const p2 = coords[end];

        let pathD = '';
        if (isAlternate) {
            // Draw a curved path avoiding the center
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            
            let nx = -dy;
            let ny = dx;
            
            const length = Math.sqrt(nx*nx + ny*ny);
            if (length > 0) { nx /= length; ny /= length; }
            
            // Push outwards towards the edge, away from center (200, 200)
            const cxToMid = midX - 200;
            const cyToMid = midY - 200;
            
            if ((nx * cxToMid + ny * cyToMid) < 0) {
                nx = -nx;
                ny = -ny;
            }
            
            const controlX = midX + nx * 120;
            const controlY = midY + ny * 120;
            
            pathD = `M ${p1.x} ${p1.y} Q ${controlX} ${controlY} ${p2.x} ${p2.y}`;
        } else {
            // Direct path
            pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;
        }

        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', pathD);
        pathElement.setAttribute('class', `route-path ${isAlternate ? 'alternate' : ''}`);

        routeSvg.appendChild(pathElement);
    }

    // --- Core Routing Logic ---
    
    // Handle "Find Best Route" click event
    checkBtn.addEventListener('click', () => {
        // Validate inputs before processing
        if (!currentLocation.value || !destination.value) {
            alert('Please select both your current location and destination.');
            return;
        }

        // Simulate a loading state for better user experience
        const originalText = checkBtn.textContent;
        checkBtn.classList.add('loading');
        checkBtn.innerHTML = '<span class="spinner"></span> Calculating...';
        checkBtn.disabled = true;

        setTimeout(() => {
            // Process the route based on selected locations
            calculateRoute(currentLocation.value, destination.value);
            
            // Show the result card and re-trigger animation if already visible
            if (resultCard.classList.contains('hidden')) {
                resultCard.classList.remove('hidden');
            } else {
                resultCard.style.animation = 'none';
                resultCard.offsetHeight; // Trigger browser reflow
                resultCard.style.animation = null; 
            }
            
            // Restore button state
            checkBtn.classList.remove('loading');
            checkBtn.textContent = originalText;
            checkBtn.disabled = false;
        }, 1200);
    });

    /**
     * Calculates the best route using the live crowd density data.
     * @param {string} start - The starting location
     * @param {string} end - The destination
     */
    function calculateRoute(start, end) {
        // Fetch the simulated live data for the destination
        const destData = zoneData[end] || { density: 10, level: 'low' };
        const density = destData.density;
        
        let crowdLevel = destData.level.charAt(0).toUpperCase() + destData.level.slice(1);
        let routeSuggestion = '';
        let baseWaitTime = 0;
        let isAlternate = false;

        // Determine severity based on density percentage
        if (density >= 75) {
            isAlternate = true;
            baseWaitTime = Math.floor(density * 0.3) + 5; // Scales up to ~35 mins
            routeSuggestion = `🚨 Severe Congestion (${density}% density): The main route from ${start} to ${end} is packed. Suggestion: Take the exterior alternative route to save time.`;
        } else if (density >= 35) {
            baseWaitTime = Math.floor(density * 0.15) + 2; // Scales to ~13 mins
            routeSuggestion = `⚠️ Warning: Moderate crowding (${density}% density) between ${start} and ${end}. You can take the main path, but expect minor delays.`;
        } else {
            baseWaitTime = Math.floor((density / 35) * 4) + 1; // 1-5 mins
            routeSuggestion = `✅ Fastest Route Available: The path from ${start} to ${end} is clear (${density}% density). Take the direct route now!`;
        }

        // Update UI elements with new data
        crowdLevelEl.textContent = `${crowdLevel} (${density}%)`;
        crowdLevelEl.className = `value ${crowdLevel.toLowerCase()}`;
        waitTimeEl.textContent = `~${baseWaitTime} mins`;
        routeTextEl.textContent = routeSuggestion;
        
        // Highlight Selected Zones
        document.querySelectorAll('.zone.block').forEach(z => z.classList.remove('selected-zone'));
        const startZone = zones.find(z => z.name === start);
        const endZone = zones.find(z => z.name === end);
        if (startZone) document.getElementById(startZone.id).classList.add('selected-zone');
        if (endZone) document.getElementById(endZone.id).classList.add('selected-zone');
        
        // Draw the animated route
        drawRoute(start, end, isAlternate);
        
        // Pan the camera to the destination zone to highlight it
        focusCameraOn(end);
    }

    // --- Advanced Features ---
    const foodBtn = document.getElementById('food-btn');
    const emergencyBtn = document.getElementById('emergency-btn');
    const notificationContainer = document.getElementById('notification-container');

    // Simulate finding the nearest food stall
    foodBtn.addEventListener('click', () => {
        const stalls = ['Burger Spot', 'Pizza Express', 'Taco Stand', 'Hot Dog Cart'];
        const randomStall = stalls[Math.floor(Math.random() * stalls.length)];
        const waitTime = Math.floor(Math.random() * 15) + 5; // Random wait time 5-19 mins
        
        showNotification(`🍔 Nearest: ${randomStall}. Est. wait: ${waitTime} mins.`);
        focusCameraOn('Food Court'); // Pan camera to food court
    });

    // Simulate an emergency alert dispatcher
    emergencyBtn.addEventListener('click', () => {
        showNotification(`🚨 Emergency Alert sent! Security dispatched to your location. Stay calm.`);
    });

    /**
     * Displays a temporary toast notification on the screen.
     * @param {string} message - The text message to display
     */
    function showNotification(message) {
        // Create the notification DOM element
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.textContent = message;

        // Append to the container
        notificationContainer.appendChild(notif);

        // Auto-remove the notification after 4 seconds
        setTimeout(() => {
            notif.classList.add('fade-out');
            setTimeout(() => {
                notif.remove();
            }, 300); // Wait for the fade-out CSS animation to complete
        }, 4000);
    }

    // --- Micro-Interactions ---
    
    // Add Ripple Effect to all buttons
    document.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const x = e.clientX - e.target.getBoundingClientRect().left;
            const y = e.clientY - e.target.getBoundingClientRect().top;
            
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            // Remove ripple element after animation completes
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
});
