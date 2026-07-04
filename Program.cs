using DotNetEnv;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseStaticFiles();

app.MapFallbackToFile("index.html");

Env.Load(); 


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

WeatherForecast[] BuildDailyForecasts(OpenWeatherResponse forecastData)
{
    return forecastData.list
        .GroupBy(f => DateOnly.FromDateTime(DateTimeOffset.FromUnixTimeSeconds(f.dt).DateTime))
        .Select(g =>
        {
            var first = g.First();
            var minTemp = g.Min(x => x.main.temp_min);
            var maxTemp = g.Max(x => x.main.temp_max);
            return new WeatherForecast(
                DateOnly.FromDateTime(DateTimeOffset.FromUnixTimeSeconds(first.dt).DateTime),
                (int)first.main.temp,
                (int)Math.Round(minTemp),
                (int)Math.Round(maxTemp),
                first.weather.First().description,
                first.main.humidity,
                first.wind.speed,
                first.pop
            );
        })
        .Take(5)
        .ToArray();
}

app.MapGet("/weatherforecast", async (HttpRequest req) =>
{
    var apiKey = Environment.GetEnvironmentVariable("WEATHER_API_KEY");
    string city = req.Query["city"].FirstOrDefault()?.Trim() ?? string.Empty;

    if (string.IsNullOrWhiteSpace(city))
    {
        return Results.BadRequest(new { error = "Invalid City, Please Try Again" });
    }

    if (string.IsNullOrWhiteSpace(apiKey))
    {
        return Results.Problem("Weather API key has not been configured.");
    }

    using var httpClient = new HttpClient();
    var lat = req.Query["lat"].FirstOrDefault();
    var lon = req.Query["lon"].FirstOrDefault();
    var state = req.Query["state"].FirstOrDefault();
    var country = req.Query["country"].FirstOrDefault();

    if (!string.IsNullOrWhiteSpace(lat) && !string.IsNullOrWhiteSpace(lon))
    {
        var forecastUrl = $"https://api.openweathermap.org/data/2.5/forecast?lat={Uri.EscapeDataString(lat)}&lon={Uri.EscapeDataString(lon)}&appid={apiKey}&units=metric";
        var forecastData = await httpClient.GetFromJsonAsync<OpenWeatherResponse>(forecastUrl);

        if (forecastData?.list == null)
        {
            return Results.Problem("No forecast data returned from the API.");
        }

        var dailyForecasts = BuildDailyForecasts(forecastData);
        return Results.Ok(new { forecast = dailyForecasts, location = new { name = city, state, country } });
    }

    var geocodeUrl = $"https://api.openweathermap.org/geo/1.0/direct?q={Uri.EscapeDataString(city)}&limit=5&appid={apiKey}";
    var geocodeResults = await httpClient.GetFromJsonAsync<List<GeoLocation>>(geocodeUrl);

    if (geocodeResults == null || geocodeResults.Count == 0)
    {
        return Results.BadRequest(new { error = "Invalid City, Please Try Again" });
    }

    if (geocodeResults.Count > 1)
    {
        var matches = geocodeResults.Select(result => new
        {
            name = result.name,
            state = result.state,
            country = result.country,
            lat = result.lat,
            lon = result.lon
        }).ToList();

        return Results.Ok(new { requiresSelection = true, matches });
    }

    var location = geocodeResults[0];
    var selectedForecastUrl = $"https://api.openweathermap.org/data/2.5/forecast?lat={location.lat}&lon={location.lon}&appid={apiKey}&units=metric";
    var selectedForecastData = await httpClient.GetFromJsonAsync<OpenWeatherResponse>(selectedForecastUrl);

    if (selectedForecastData?.list == null)
    {
        return Results.Problem("No forecast data returned from the API.");
    }

    var selectedDailyForecasts = BuildDailyForecasts(selectedForecastData);
    return Results.Ok(new { forecast = selectedDailyForecasts, location = new { name = location.name, state = location.state, country = location.country } });
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, int MinTemperatureC, int MaxTemperatureC, string? Summary, int Humidity, double WindSpeed, double Pop)
{

}

// Models for OpenWeatherMap API
public class GeoLocation
{
    public required string name { get; set; }
    public string? state { get; set; }
    public string? country { get; set; }
    public double lat { get; set; }
    public double lon { get; set; }
}

public class OpenWeatherResponse
{
    public required List<ForecastItem> list { get; set; }
}


public class ForecastItem
{
    public long dt { get; set; }
    public required MainData main { get; set; }
    public required List<WeatherData> weather { get; set; }
    public required WindData wind { get; set; }
    public double pop { get; set; }
}

public class MainData
{
    public double temp { get; set; }
    public double temp_min { get; set; }
    public double temp_max { get; set; }
    public int humidity { get; set; }

}
public class WindData
{
    public double speed { get; set; }
}

public class WeatherData
{
    public required string description { get; set; }
}

