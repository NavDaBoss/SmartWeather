# SmartWeather

A minimal ASP.NET Core web application that serves a weather forecast API and static frontend using the OpenWeatherMap API.

## Features

- Global weather forecast lookup by city name.
- Handles ambigious city names by allowing users to choose from a dropdown.
- Displays five day weather forecast in both Fahrenheit or Celsius (Toggleable).
- Shows hi, low, humidity, wind speed, and chance of precipitation for each day.

## Requirements

- .NET 9 SDK
- OpenWeatherMap API key

## Configuration

Create a `.env` file or set the environment variable directly:

```env
WEATHER_API_KEY=your_openweathermap_api_key_here
```

## Run locally

Restore packages and run the app:

```bash
dotnet restore
dotnet run
```

The app will start on the default ASP.NET Core URL, typically `https://localhost:7249` or `http://localhost:5249`.

## API Endpoint

The application exposes a weather endpoint:

```http
GET /weatherforecast?city={city}
```

Optional query parameters:

- `city` - city name to search
- `lat` - latitude for direct coordinates lookup
- `lon` - longitude for direct coordinates lookup
- `state` - optional state metadata returned in the response
- `country` - optional country metadata returned in the response

### Example

```http
GET /weatherforecast?city=Seattle
```

If multiple cities match the query, the API returns a selection list with `requiresSelection: true`.

## Notes

- The frontend assets are served from `wwwroot`
- The application uses `DotNetEnv` to load environment variables from a `.env` file
- Forecast data is retrieved from OpenWeatherMap and grouped into daily summaries
