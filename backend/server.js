require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---
// These load from your .env file
const WEATHER_API_KEY = process.env.WEATHER_API_KEY; 
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const MONGO_URI = process.env.MONGO_URI; 

// --- DATABASE CONNECTION ---
mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB Database"))
    .catch(err => console.error("❌ Database Error:", err));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    language: { type: String, default: 'en' },
    location: String
});

const RecordSchema = new mongoose.Schema({
    userId: String,
    city: String,
    temperature: Number,
    condition: String,
    advice: String,
    irrigate: Boolean,
    date: { type: Date, default: Date.now } 
});

const User = mongoose.model('User', UserSchema);
const Record = mongoose.model('IrrigationRecord', RecordSchema);

// --- BACKUP NEWS GENERATOR (Fail-safe) ---
const generateBackupNews = (city) => {
    const location = city || "Global";
    const images = [
        "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&q=80", 
        "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80",
        "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=600&q=80",
        "https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&q=80"
    ];
    const titles = [
        "New Sustainable Irrigation Methods Approved",
        `Bumper Crop Harvest Expected in ${location}`,
        "Global Wheat Prices Stabilize After Surge",
        "Smart Farming: Using Drones for Soil Health"
    ];
    
    let news = [];
    for(let i=0; i<20; i++) {
        news.push({
            id: `backup-${i}`,
            title: titles[i % titles.length],
            source: "AgriWire",
            time: `${Math.floor(Math.random()*12)+1} hours ago`,
            image: images[i % images.length],
            url: `https://www.google.com/search?q=${encodeURIComponent(titles[i % titles.length])}`
        });
    }
    return news;
};

// --- ROUTES ---

// 1. NEWS ROUTE
app.get('/api/news', async (req, res) => {
    const city = req.query.city || "India";
    const query = `agriculture OR farming OR crops AND (${city} OR India)`;
    
    try {
        const response = await axios.get(`https://newsapi.org/v2/everything`, {
            params: {
                q: query,
                language: 'en',
                sortBy: 'publishedAt',
                pageSize: 40,
                apiKey: NEWS_API_KEY
            }
        });

        const validArticles = response.data.articles
            .filter(article => article.urlToImage && article.title && article.url)
            .map((article, index) => ({
                id: index,
                title: article.title,
                source: article.source.name || "News Source",
                time: new Date(article.publishedAt).toLocaleDateString(),
                image: article.urlToImage,
                url: article.url
            }));

        if (validArticles.length < 2) throw new Error("Not enough news");
        res.json(validArticles);

    } catch (error) {
        console.log("NewsAPI Error (falling back to backup):", error.message);
        res.json(generateBackupNews(city));
    }
});

// 2. AUTH ROUTES
app.post('/api/register', async (req, res) => {
    const { username, password, language, location } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, language, location });
        await newUser.save();
        res.json({ success: true, user: newUser });
    } catch (error) { res.status(500).json({ error: "Registration failed" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

        res.json({ success: true, user });
    } catch (error) { res.status(500).json({ error: "Login failed" }); }
});

// 3. WEATHER & ANALYSIS ROUTE
app.post('/api/check-irrigation', async (req, res) => {
    const { city, lat, lon, userId } = req.body;
    try {
        let weatherUrl, forecastUrl;
        let finalLat = lat;
        let finalLon = lon;
        
        // --- 1. DETERMINE LOCATION ---
        let preciseCityName = null;
        
        if (lat && lon) {
            // Reverse Geocoding for precise name
            try {
                const geoRes = await axios.get(`https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${WEATHER_API_KEY}`);
                if (geoRes.data && geoRes.data.length > 0) preciseCityName = geoRes.data[0].name;
            } catch (geoError) { console.error("GeoAPI Error:", geoError.message); }

            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
            forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
        } else {
            weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
            forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${WEATHER_API_KEY}&units=metric`;
        }

        const [weatherRes, forecastRes] = await Promise.all([axios.get(weatherUrl), axios.get(forecastUrl)]);
        const data = weatherRes.data;
        
        // Update lat/lon in case we searched by city string
        finalLat = data.coord.lat;
        finalLon = data.coord.lon;

        // --- 2. FETCH NEARBY CITIES (For Map) ---
        let nearbyData = [];
        try {
            const nearbyUrl = `https://api.openweathermap.org/data/2.5/find?lat=${finalLat}&lon=${finalLon}&cnt=6&appid=${WEATHER_API_KEY}&units=metric`;
            const nearbyRes = await axios.get(nearbyUrl);
            
            nearbyData = nearbyRes.data.list.map(item => ({
                id: item.id,
                name: item.name,
                lat: item.coord.lat,
                lon: item.coord.lon,
                temp: Math.round(item.main.temp),
                icon: item.weather[0].icon,
                condition: item.weather[0].main
            }));
            // Remove duplicates
            nearbyData = nearbyData.filter(n => n.name !== data.name);
        } catch (e) {
            console.log("Could not fetch nearby cities", e.message);
        }

        // --- 3. PROCESS FORECAST ---
        const forecastData = forecastRes.data.list.map(item => {
            let rainChance = Math.round((item.pop || 0) * 100);
            const clouds = item.clouds ? item.clouds.all : 0;
            if (rainChance === 0 && clouds > 90) rainChance = 15;
            
            return {
                dt: item.dt,
                time: new Date(item.dt * 1000).toLocaleTimeString([], {hour: 'numeric', hour12: true}),
                date: new Date(item.dt * 1000).toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'}),
                temp: Math.round(item.main.temp),
                humidity: item.main.humidity, 
                rain: rainChance,             
                iconCode: item.weather[0].icon, 
                condition: item.weather[0].main,
                desc: item.weather[0].description
            };
        });

        const finalCityName = preciseCityName || data.name;
        
        // --- 4. IRRIGATION LOGIC ---
        const temp = data.main.temp;
        const humidity = data.main.humidity;
        const weatherCondition = data.weather[0].main; 
        const windSpeed = data.wind.speed;
        const windGust = data.wind.gust || (windSpeed * 1.2); 

        let message = "";
        let shouldIrrigate = false;
        let suggestions = [];

        if (weatherCondition.includes('Rain') || weatherCondition.includes('Drizzle')) {
            message = "It's raining! No need to irrigate.";
            shouldIrrigate = false;
            suggestions.push("Clear drainage channels.");
            suggestions.push("Pause fertilizer application.");
        } else if (humidity > 80) {
            message = "High humidity. Soil is wet.";
            shouldIrrigate = false;
            suggestions.push("Watch for fungal diseases.");
            suggestions.push("Ensure good plant ventilation.");
        } else if (temp > 30) {
            message = "High heat! Irrigate heavily.";
            shouldIrrigate = true;
            suggestions.push("Apply mulch to soil.");
            suggestions.push("Water early morning.");
        } else {
            message = "Standard irrigation recommended.";
            shouldIrrigate = true;
            suggestions.push("Check soil moisture depth.");
            suggestions.push("Weed control recommended.");
        }

        if (userId) {
            const newRecord = new Record({ userId, city: finalCityName, temperature: temp, condition: weatherCondition, advice: message, irrigate: shouldIrrigate });
            await newRecord.save();
        }

        res.json({
            city: finalCityName,
            coord: data.coord,
            temperature: temp,
            condition: weatherCondition,
            humidity: humidity,
            windSpeed: windSpeed,
            windGust: windGust,
            advice: message,
            suggestions: suggestions,
            irrigate: shouldIrrigate,
            forecast: forecastData,
            nearby: nearbyData // Sends nearby cities to frontend
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching weather data." });
    }
});

// 4. HISTORY ROUTES
app.get('/api/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await Record.find({ userId }).sort({ date: -1 }).limit(10);
        res.json(history);
    } catch (error) { res.status(500).json({ error: "History error" }); }
});

app.delete('/api/history/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Record.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: "Delete error" }); }
});

// --- SERVER START ---
const PORT = process.env.PORT || 5000;

// Only run app.listen in development, not production
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

// Export the Express API for Vercel
module.exports = app;