/**
 * WEATHER DASHBOARD TODOs
 * -----------------------
 * Easy:
 *  - [ ] Add °C / °F toggle
 *  - [ ] Show weather icon (current + forecast)
 *  - [ ] Show feels-like temperature & wind speed
 *  - [ ] Add loading skeleton instead of plain text
 *  - [ ] Style forecast cards with condition color badges
 * Medium:
 *  - [ ] Dynamic background / gradient based on condition (sunny, rain, snow)
 *  - [ ] Input debounced search (on stop typing)
 *  - [ ] Persist last searched city (localStorage)
 *  - [ ] Add error retry button component
 *  - [ ] Add favorites list (pin cities)
 * Advanced:
 *  - [ ] Hourly forecast visualization (line / area chart)
 *  - [ ] Animate background transitions
 *  - [ ] Add geolocation: auto-detect user city (with permission)
 *  - [ ] Extract API call into /src/services/weather.js and add caching
 */
import { useEffect, useState } from "react";
import Loading from "../components/Loading.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import Card from "../components/Card.jsx";

export default function Weather() {
  const [city, setCity] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState("C"); // °C by default
  const [isLocAllowed, setIsLocAllowed] = useState(null);
  const [isRequestingLoc, setIsRequestingLoc] = useState(false);

  useEffect(() => {
    const storedCity = localStorage.getItem("current_city");
    if (storedCity) {
      setIsLocAllowed(true);
      setCity(JSON.parse(storedCity));
    } else if (navigator.geolocation) {
      requestLocation();
    } else {
      setIsLocAllowed(false);
      setError(
        "Your browser does not support location detection. Please enter city manually."
      );
      setCity("London");
    }
  }, []);

  useEffect(() => {
    if (city) {
      fetchWeather(city);
    }
  }, [city]);

  async function getCurrentCity(lat, lon) {
    const APIkey = import.meta.env.VITE_WEATHER_API_KEY;
    try {
      const res = await fetch(
        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&appid=${APIkey}`
      );
      const data = await res.json();
      if (data && data.length > 0 && data[0].name) {
        setCity(data[0].name);
        setError(null);
        setIsLocAllowed(true);
        localStorage.setItem("current_city", JSON.stringify(data[0].name));
      } else {
        setCity("London");
        setError("Could not detect city from location.");
        setIsLocAllowed(false);
      }
    } catch (err) {
      console.log(err);
      setCity("London");
      setError(err.message);
      setIsLocAllowed(false);
    }
  }

  function requestLocation() {
    setIsRequestingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async function onSuccess(position) {
        await getCurrentCity(
          position.coords.latitude,
          position.coords.longitude
        );
        setIsRequestingLoc(false);
      },

      function onError(err) {
        console.log("Error", err);
        setIsLocAllowed(false);
        setError(
          "Location is blocked. Please enable location in your browser settings to detect automatically."
        );
        setCity("London");
        setIsRequestingLoc(false);
      }
    );
  }
  async function fetchWeather(c) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `https://wttr.in/${encodeURIComponent(c)}?format=j1`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();

      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const current = data?.current_condition?.[0];
  const forecast = data?.weather?.slice(0, 3) || [];

  // Helper to convert °C to °F
  const displayTemp = (c) => (unit === "C" ? c : Math.round((c * 9) / 5 + 32));

  return (
    <div>
      <h2>Weather Dashboard</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          fetchWeather(city);
        }}
        className="inline-form"
      >
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city"
        />
        <button type="submit" disabled={isRequestingLoc}>
          Fetch
        </button>
        <button
          type="button"
          disabled={isRequestingLoc}
          onClick={() => requestLocation()}
        >
          {isLocAllowed
            ? isRequestingLoc
              ? "Updating..."
              : "Update location"
            : isRequestingLoc
            ? "Detecting..."
            : "Detect my location"}
        </button>
      </form>

      {/* Toggle button */}
      <div style={{ margin: "10px 0" }}>
        <button onClick={() => setUnit(unit === "C" ? "F" : "C")}>
          Switch to °{unit === "C" ? "F" : "C"}
        </button>
      </div>

      {loading && <Loading />}
      {error && <ErrorMessage error={error} />}

      {current && (
        <Card title={`Current in ${city}`}>
          <p>
            Temperature: {displayTemp(Number(current.temp_C))}°{unit}
          </p>
          <p>Humidity: {current.humidity}%</p>
          <p>Desc: {current.weatherDesc?.[0]?.value}</p>
        </Card>
      )}

      <div className="grid">
        {forecast.map((day) => (
          <Card key={day.date} title={day.date}>
            <p>
              Avg Temp: {displayTemp(Number(day.avgtempC))}°{unit}
            </p>
            <p>Sunrise: {day.astronomy?.[0]?.sunrise}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
