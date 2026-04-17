document.addEventListener('DOMContentLoaded', () => {
    const checkBtn = document.getElementById('check-btn');
    const currentLocation = document.getElementById('current-location');
    const destination = document.getElementById('destination');
    const resultCard = document.getElementById('result-card');
    
    const crowdLevelEl = document.getElementById('crowd-level');
    const waitTimeEl = document.getElementById('wait-time');
    const routeTextEl = document.getElementById('route-text');

    checkBtn.addEventListener('click', () => {
        if (!currentLocation.value || !destination.value) {
            alert('Please select both your current location and destination.');
            return;
        }

        // Simulate thinking/loading
        const originalText = checkBtn.textContent;
        checkBtn.textContent = 'Calculating...';
        checkBtn.disabled = true;

        setTimeout(() => {
            calculateRoute(currentLocation.value, destination.value);
            
            // Show result card with animation
            if (resultCard.classList.contains('hidden')) {
                resultCard.classList.remove('hidden');
            } else {
                resultCard.style.animation = 'none';
                resultCard.offsetHeight; // trigger reflow
                resultCard.style.animation = null; 
            }
            
            checkBtn.textContent = originalText;
            checkBtn.disabled = false;
        }, 600);
    });

    function calculateRoute(start, end) {
        // Simulate realistic crowd density percentage (0-100)
        const density = Math.floor(Math.random() * 101);
        
        let crowdLevel = '';
        let routeSuggestion = '';
        let baseWaitTime = 0;

        if (density >= 75) {
            crowdLevel = 'High';
            baseWaitTime = Math.floor(density * 0.3) + 5; // Higher wait time for high density
            routeSuggestion = `🚨 Severe Congestion (${density}% density): The main route from ${start} to ${end} is packed. Suggestion: Take the exterior alternative route to save time.`;
        } else if (density >= 35) {
            crowdLevel = 'Medium';
            baseWaitTime = Math.floor(density * 0.15) + 2;
            routeSuggestion = `⚠️ Warning: Moderate crowding (${density}% density) between ${start} and ${end}. You can take the main path, but expect minor delays.`;
        } else {
            crowdLevel = 'Low';
            baseWaitTime = Math.floor((density / 35) * 4) + 1; // 1-5 mins
            routeSuggestion = `✅ Fastest Route Available: The path from ${start} to ${end} is clear (${density}% density). Take the direct route now!`;
        }

        // Dynamic text updates with percentage
        crowdLevelEl.textContent = `${crowdLevel} (${density}%)`;
        crowdLevelEl.className = `value ${crowdLevel.toLowerCase()}`;
        waitTimeEl.textContent = `~${baseWaitTime} mins`;
        routeTextEl.textContent = routeSuggestion;
    }
});
