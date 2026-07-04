document.addEventListener('DOMContentLoaded', async () => {
    const forecastEl = document.getElementById('forecast');
    const errorEl = document.getElementById('error');
    const toggleBtnContainer = document.getElementById('toggle-btn-container');
    const cityForm = document.getElementById('city-form');
    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const forecastTitle = document.getElementById('forecast-title');
    const locationInfoEl = document.getElementById('location-info');
    const locationPickerContainer = document.getElementById('location-picker-container');
    const locationSelect = document.getElementById('location-select');
    const locationConfirmBtn = document.getElementById('location-confirm-btn');

    // Track current unit
    let useCelsius = true;
    let forecastData = [];

    // Enable search only if the city field is filled
    function updateSearchBtn() {
        searchBtn.disabled = !cityInput.value.trim();
    }
    cityInput.addEventListener('input', updateSearchBtn);

    // Add toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Show °F';
    toggleBtn.className = 'toggle-btn';
    toggleBtn.style.marginBottom = '20px';
    toggleBtn.onclick = () => {
        useCelsius = !useCelsius;
        toggleBtn.textContent = useCelsius ? 'Show °F' : 'Show °C';
        renderForecast();
    };
    //forecastEl.parentNode.insertBefore(toggleBtn, forecastEl);
    toggleBtnContainer.appendChild(toggleBtn);

    function hideLocationPicker() {
        locationPickerContainer.hidden = true;
        locationSelect.innerHTML = '';
        locationSelect.disabled = true;
        locationConfirmBtn.disabled = true;
    }

    function showLocationPicker(matches) {
        locationSelect.innerHTML = '<option value="">Choose a location</option>';
        matches.forEach(match => {
            const option = document.createElement('option');
            const locationLabel = [match.name, match.state, match.country].filter(Boolean).join(', ');
            option.value = `${match.lat}|${match.lon}|${match.name}|${match.state || ''}|${match.country || ''}`;
            option.textContent = locationLabel;
            locationSelect.appendChild(option);
        });
        locationPickerContainer.hidden = false;
        const shouldDisable = matches.length <= 1;
        locationSelect.disabled = shouldDisable;
        locationConfirmBtn.disabled = shouldDisable;
    }

    function updateLocationInfo(location) {
        const resolvedName = location?.name || cityInput.value.trim() || 'City';
        const locationLabel = [resolvedName, location?.state, location?.country].filter(Boolean).join(', ');
        forecastTitle.textContent = `${resolvedName} 5-Day Forecast`;
        locationInfoEl.textContent = locationLabel || 'Location unavailable';
        cityInput.value = resolvedName;
    }

    function formatSelectedLocationLabel(selection) {
        return [selection?.name, selection?.state, selection?.country].filter(Boolean).join(', ');
    }

    // Fetch and render forecast for a city
    async function fetchForecast(city, locationSelection = null) {
        errorEl.textContent = '';
        hideLocationPicker();
        forecastEl.innerHTML = '<div class="loading">Loading...</div>';
        try {
            const params = new URLSearchParams({ city });
            if (locationSelection) {
                params.set('lat', locationSelection.lat);
                params.set('lon', locationSelection.lon);
                params.set('state', locationSelection.state || '');
                params.set('country', locationSelection.country || '');
            }

            const res = await fetch(`/weatherforecast?${params.toString()}`);
            let payload = null;
            try {
                payload = await res.json();
            } catch {
                payload = null;
            }

            if (!res.ok) {
                throw new Error(payload?.error || 'Invalid City, Please Try Again');
            }

            if (payload?.requiresSelection) {
                showLocationPicker(payload.matches || []);
                forecastEl.innerHTML = '';
                return;
            }

            forecastData = payload?.forecast || [];
            updateLocationInfo(payload?.location || { name: city });
            renderForecast();
        } catch (err) {
            forecastEl.innerHTML = '';
            errorEl.textContent = err.message || 'Could not load forecast.';
        }
    }

    // Handle city search
    cityForm.addEventListener('submit', async e => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (city) {
            errorEl.textContent = '';
            forecastEl.innerHTML = '<div class="loading">Loading...</div>';
            searchBtn.disabled = true;
            await fetchForecast(city);
            searchBtn.disabled = false;
            history.replaceState(null, '', `?city=${encodeURIComponent(city)}`);
        }
    });

    locationConfirmBtn.addEventListener('click', () => {
        const selectedValue = locationSelect.value;
        if (!selectedValue) {
            return;
        }

        const [lat, lon, name, state, country] = selectedValue.split('|');
        const selectedLocation = { name, state, country, lat, lon };
        locationSelect.disabled = true;
        locationConfirmBtn.disabled = true;
        cityInput.value = selectedLocation.name || cityInput.value.trim();
        forecastTitle.textContent = `${selectedLocation.name || cityInput.value.trim() || 'City'} 5-Day Forecast`;
        locationInfoEl.textContent = formatSelectedLocationLabel(selectedLocation);
        fetchForecast(cityInput.value.trim(), selectedLocation);
    });

    function renderForecast() {
        forecastEl.innerHTML = '';
        forecastData.forEach(day => {
            const card = document.createElement('div');
            card.className = 'forecast-card';

            const date = new Date(day.date);
            const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
            const dateStr = date.toLocaleDateString(undefined, options);

            // Support both C and F
            const temp = useCelsius
                ? (day.temperatureC ?? day.temperature)
                : (day.temperatureF ?? (32 + Math.round((day.temperatureC ?? day.temperature) / 0.5556)));
            const minTemp = useCelsius
                ? (day.minTemperatureC ?? day.minTemperature)
                : (day.minTemperatureF ?? (32 + Math.round((day.minTemperatureC ?? day.minTemperature) / 0.5556)));
            const maxTemp = useCelsius
                ? (day.maxTemperatureC ?? day.maxTemperature)
                : (day.maxTemperatureF ?? (32 + Math.round((day.maxTemperatureC ?? day.maxTemperature) / 0.5556)));

            const unit = useCelsius ? 'C' : 'F';

            card.innerHTML = `
                <div class="date">${dateStr}</div>
                <div class="temp">${temp}&deg;${unit}</div>
                <div class="highlow">
                    <span class="high">H: ${maxTemp}&deg;${unit}</span>
                    <span class="low">L: ${minTemp}&deg;${unit}</span>
                </div>
                <div class="desc">${day.summary}</div>
                <div class="extras">
                    <div class="humidity">💧: ${day.humidity}%</div>
                    <div class="wind">💨: ${Math.round(day.windSpeed * 2.237)} mph</div>
                    <div class="precipitation">🌧️: ${Math.round(day.pop * 100)}%</div>
                </div>
            `;
            forecastEl.appendChild(card);
        });
    }

    function getCityFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('city') || "Los Angeles";
    }

    // Initial load for city in URL or default
    const city = getCityFromUrl();
    cityInput.value = city;
    updateSearchBtn();
    fetchForecast(city);
});