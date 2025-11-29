import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Search, Droplets, Wind, Zap, MapPin, 
  CloudRain, Sun, Cloud, Trash2, Moon, 
  CloudSun, Calendar, BarChart2,
  Activity, LogOut, CloudFog, Map as MapIcon, Newspaper, Sprout,
  ChevronDown, Settings, Users, MessageSquare, Bell, ArrowRight,
  Landmark, UserPlus, X, Globe 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './App.css'; 

// --- CONFIGURATION (VERCEL READY) ---
// If running locally (npm run dev), use localhost:5000.
// If running on Vercel (Production), use relative path (proxy).
const API_URL = import.meta.env.MODE === 'development' ? 'http://localhost:5000' : '';

// --- LEAFLET ICON FIX ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Weather Icon Generator for Map
const createWeatherIcon = (iconCode) => {
  return new L.DivIcon({
    html: `<div style="background-color: rgba(0,0,0,0.7); border-radius: 50%; padding: 5px; border: 2px solid white; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
             <img src="https://openweathermap.org/img/wn/${iconCode}.png" style="width: 30px; height: 30px;" />
           </div>`,
    className: 'custom-weather-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

// --- TRANSLATION HELPER ---
const getTranslatedAdvice = (text, t) => {
    if (!text) return "";
    if (text.includes("raining")) return t.adv_rain;
    if (text.includes("High humidity")) return t.adv_humid;
    if (text.includes("High heat")) return t.adv_heat;
    if (text.includes("Standard")) return t.adv_std;
    if (text.includes("drainage")) return t.adv_clear_drain;
    if (text.includes("fungal")) return t.adv_fungal;
    if (text.includes("mulch")) return t.adv_mulch;
    if (text.includes("Weed")) return t.adv_weed;
    return text; 
};

// --- TRANSLATIONS ---
const translations = {
  en: { 
    appTitle: "Ajanova", subTitle: "Stop guessing. Start growing.", dashboard: "Dashboard", hourly: "Hourly Report", news: "Farming News", autoLocate: "Auto-Locate", searchPlaceholder: "Search city...", checkNow: "Analyze", waterNow: "💧 WATER NOW", doNotWater: "🛑 DO NOT WATER", humidity: "Humidity", precip: "Precip", todayWeather: "TODAY'S CONDITIONS", currentWeather: "LIVE METRICS", lookingAhead: "FORECAST INSIGHT", farmLocation: "FARM LOCATION", cropTips: "AI CROP ADVICE", currentConditions: "Current Conditions", tonight: "Tonight", wind: "Wind", windGusts: "Gusts", airQuality: "Air Quality", login: "Login", register: "Register", username: "Username", password: "Password", submit: "Submit", logout: "Logout", welcome: "Welcome", recentActivity: "Recent Activity", water: "Water", skip: "Skip",
    adv_rain: "It's raining! No need to irrigate.", adv_humid: "High humidity. Soil is wet.", adv_heat: "High heat! Irrigate heavily.", adv_std: "Standard irrigation recommended.", adv_clear_drain: "Clear drainage channels.", adv_fungal: "Watch for fungal diseases.", adv_mulch: "Apply mulch to soil.", adv_weed: "Weed control recommended."
  },
  hi: { 
    appTitle: "अजानोवा", subTitle: "स्मार्ट सिंचाई हब", dashboard: "डैशबोर्ड", hourly: "प्रति घंटा रिपोर्ट", news: "खेती समाचार", autoLocate: "स्वतः पता लगाएँ", searchPlaceholder: "अपना शहर खोजें...", checkNow: "अभी जाँचें", waterNow: "💧 अभी पानी दें", doNotWater: "🛑 पानी न दें", humidity: "नमी", precip: "वर्षा", todayWeather: "आज का मौसम", currentWeather: "वर्तमान मौसम", lookingAhead: "आगे देखें", farmLocation: "खेत का स्थान", cropTips: "फसल सुझाव", currentConditions: "वर्तमान स्थितियाँ", tonight: "आज रात", wind: "हवा", windGusts: "झोंके", airQuality: "वायु गुणवत्ता", login: "लॉग इन", register: "पंजीकरण", username: "उपयोगकर्ता नाम", password: "पासवर्ड", submit: "जमा करें", logout: "लॉग आउट", welcome: "स्वागत है", recentActivity: "हाल की गतिविधि", water: "पानी", skip: "छोड़ें",
    adv_rain: "बारिश हो रही है! पानी देने की जरूरत नहीं है।", adv_humid: "अधिक नमी। मिट्टी गीली है।", adv_heat: "तेज गर्मी! भरपूर पानी दें।", adv_std: "मानक सिंचाई की सिफारिश की गई है।", adv_clear_drain: "जल निकासी नालियों को साफ करें।", adv_fungal: "फंगल रोगों पर नजर रखें।", adv_mulch: "मिट्टी में मल्च का प्रयोग करें।", adv_weed: "खरपतवार नियंत्रण की सिफारिश की गई है।"
  },
  kn: { 
    appTitle: "ಅಜಾನೋವಾ", subTitle: "ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ ಹಬ್", dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", hourly: "ಗಂಟೆಯ ವರದಿ", news: "ಕೃಷಿ ಸುದ್ದಿ", autoLocate: "ಸ್ವಯಂ ಪತ್ತೆ", searchPlaceholder: "ನಿಮ್ಮ ನಗರವನ್ನು ಹುಡುಕಿ...", checkNow: "ಈಗ ಪರಿಶೀಲಿಸಿ", waterNow: "💧 ಈಗ ನೀರು ಹಾಕಿ", doNotWater: "🛑 ನೀರು ಹಾಕಬೇಡಿ", humidity: "ತೇವಾಂಶ", precip: "ಮಳೆ", todayWeather: "ಇಂದಿನ ಹವಾಮಾನ", currentWeather: "ಪ್ರಸ್ತುತ ಹವಾಮಾನ", lookingAhead: "ಮುಂದೆ ನೋಡಿ", farmLocation: "ಜಮೀನಿನ ಸ್ಥಳ", cropTips: "ಬೆಳೆ ಸಲಹೆಗಳು", currentConditions: "ಪ್ರಸ್ತುತ ಸ್ಥಿತಿಗಳು", tonight: "ಈ ರಾತ್ರಿ", wind: "ಗಾಳಿ", windGusts: "ಗಾಳಿಯ ವೇಗ", airQuality: "ವಾಯು ಗುಣಮಟ್ಟ", login: "ಲಾಗಿನ್", register: "ನೋಂದಣಿ", username: "ಬಳಕೆದಾರ ಹೆಸರು", password: "ಪಾಸ್ವರ್ಡ್", submit: "ಸಲ್ಲಿಸಿ", logout: "ಲಾಗ್ ಔಟ್", welcome: "ಸ್ವಾಗತ", recentActivity: "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ", water: "ನೀರು", skip: "ಬಿಟ್ಟುಬಿಡಿ",
    adv_rain: "ಮಳೆ ಬರುತ್ತಿದೆ! ನೀರಾವರಿ ಅಗತ್ಯವಿಲ್ಲ.", adv_humid: "ಹೆಚ್ಚಿನ ಆರ್ದ್ರತೆ. ಮಣ್ಣು ತೇವವಾಗಿದೆ.", adv_heat: "ಹೆಚ್ಚಿನ ಶಾಖ! ಹೆಚ್ಚು ನೀರು ಹಾಕಿ.", adv_std: "ಸಾಮಾನ್ಯ ನೀರಾವರಿ ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ.", adv_clear_drain: "ಚರಂಡಿಗಳನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸಿ.", adv_fungal: "ಶಿಲೀಂಧ್ರ ರೋಗಗಳ ಬಗ್ಗೆ ಎಚ್ಚರವಿರಲಿ.", adv_mulch: "ಮಣ್ಣಿಗೆ ಹೊದಿಕೆ (Mulch) ಹಾಕಿ.", adv_weed: "ಕಳೆ ನಿಯಂತ್ರಣ ಅತ್ಯಗತ್ಯ."
  },
  te: { 
    appTitle: "అజానోవా", subTitle: "స్మార్ట్ ఇరిగేషన్ హబ్", dashboard: "డ్యాష్‌బోర్డ్", hourly: "గంట నివేదిక", news: "వ్యవసాయ వార్తలు", autoLocate: "స్వీయ గుర్తింపు", searchPlaceholder: "మీ నగరాన్ని వెతకండి...", checkNow: "విశ్లేషించండి", waterNow: "💧 ఇప్పుడే నీరు పెట్టండి", doNotWater: "🛑 నీరు పెట్టవద్దు", humidity: "తేమ", precip: "వర్షపాతం", todayWeather: "నేటి వాతావరణం", currentWeather: "ప్రస్తుత కొలతలు", lookingAhead: "భవిష్యత్ సూచన", farmLocation: "పొలం స్థానం", cropTips: "పంట సలహాలు", currentConditions: "ప్రస్తుత పరిస్థితులు", tonight: "ఈ రాత్రి", wind: "గాలి", windGusts: "గాలుల వేగం", airQuality: "గాలి నాణ్యత", login: "లాగిన్", register: "నమోదు", username: "యూజర్ పేరు", password: "పాస్వర్డ్", submit: "సమర్పించు", logout: "లాగ్ అవుట్", welcome: "స్వాగతం", recentActivity: "ఇటీవలి కార్యాచరణ", water: "నీరు", skip: "వదిలేయండి",
    adv_rain: "వర్షం పడుతోంది! నీరు పెట్టాల్సిన అవసరం లేదు.", adv_humid: "అధిక తేమ. నేల తడిగా ఉంది.", adv_heat: "అధిక వేడి! బాగా నీరు పెట్టండి.", adv_std: "సాధారణ నీటిపారుదల సిఫార్సు చేయబడింది.", adv_clear_drain: "డ్రైనేజీ కాలువలను శుభ్రం చేయండి.", adv_fungal: "శిలీంధ్ర వ్యాధుల పట్ల జాగ్రత్త వహించండి.", adv_mulch: "నేల పై కప్ప (Mulch) వేయండి.", adv_weed: "కలుపు నియంత్రణ సిఫార్సు చేయబడింది."
  },
  ml: { 
    appTitle: "അജാനോവ", subTitle: "ഊഹിക്കുന്നത് നിർത്തൂ. കൃഷി തുടങ്ങൂ.", dashboard: "ഡാഷ്ബോർഡ്", hourly: "മണിക്കൂർ റിപ്പോർട്ട്", news: "കാർഷിക വാർത്തകൾ", autoLocate: "ഓട്ടോ-ലൊക്കേറ്റ്", searchPlaceholder: "നിങ്ങളുടെ നഗരം തിരയുക...", checkNow: "പരിശോധിക്കുക", waterNow: "💧 ഇപ്പോൾ നനയ്ക്കൂ", doNotWater: "🛑 നനയ്ക്കരുത്", humidity: "ഈർപ്പം", precip: "മഴ", todayWeather: "ഇന്നത്തെ കാലാവസ്ഥ", currentWeather: "നിലവിലെ അളവുകൾ", lookingAhead: "പ്രവചനം", farmLocation: "കൃഷിയിടം", cropTips: "വിള ഉപദേശങ്ങൾ", currentConditions: "നിലവിലെ അവസ്ഥ", tonight: "ഇന്ന് രാത്രി", wind: "കാറ്റ്", windGusts: "കാറ്റിന്റെ വേഗത", airQuality: "വായു ഗുണനിലവാരം", login: "ലോഗിൻ", register: "രജിസ്റ്റർ", username: "ഉപയോക്തൃനാമം", password: "പാസ്‌വേഡ്", submit: "സമർപ്പിക്കുക", logout: "ലോഗ് ഔട്ട്", welcome: "സ്വാഗതം", recentActivity: "സമീപകാല പ്രവർത്തനം", water: "വെള്ളം", skip: "ഒഴിവാക്കുക",
    adv_rain: "മഴ പെയ്യുന്നു! നനയ്ക്കേണ്ട ആവശ്യമില്ല.", adv_humid: "അന്തരീക്ഷ ഈർപ്പം കൂടുതൽ. മണ്ണ് നനഞ്ഞതാണ്.", adv_heat: "കടുത്ത ചൂട്! നന്നായി നനയ്ക്കുക.", adv_std: "സാധാരണ നനയ്ക്കൽ മതിയാകും.", adv_clear_drain: "ഡ്രെയിനേജ് ചാനലുകൾ വൃത്തിയാക്കുക.", adv_fungal: "ഫംഗസ് രോഗങ്ങൾ ശ്രദ്ധിക്കുക.", adv_mulch: "മണ്ണിൽ പുതയിടുക (Mulch).", adv_weed: "കളനിയന്ത്രണം അത്യാവശ്യമാണ്."
  },
  ta: { 
    appTitle: "அஜானோவா", subTitle: "ஸ்மார்ட் பாசன மையம்", dashboard: "டாஷ்போர்டு", hourly: "மணிநேர அறிக்கை", news: "விவசாய செய்திகள்", autoLocate: "தானியங்கி கண்டுபிடிப்பு", searchPlaceholder: "நகரத்தைத் தேடுங்கள்...", checkNow: "ஆய்வு செய்", waterNow: "💧 நீர் பாய்ச்சவும்", doNotWater: "🛑 நீர் பாய்ச்ச வேண்டாம்", humidity: "ஈரப்பதம்", precip: "மழைப்பொழிவு", todayWeather: "இன்றைய வானிலை", currentWeather: "நேரடி அளவீடுகள்", lookingAhead: "முன்னறிவிப்பு", farmLocation: "பண்ணை இடம்", cropTips: "பயிர் குறிப்புகள்", currentConditions: "தற்போதைய நிலை", tonight: "இன்று இரவு", wind: "காற்று", windGusts: "வேகம்", airQuality: "காற்றின் தரம்", login: "உள்நுழைய", register: "பதிவு செய்ய", username: "பயனர் பெயர்", password: "கடவுச்சொல்", submit: "சமர்ப்பிக்கவும்", logout: "வெளியேறு", welcome: "வரவேற்பு", recentActivity: "சமீபத்திய செயல்பாடு", water: "நீர்", skip: "தவிர்",
    adv_rain: "மழை பெய்கிறது! நீர் பாய்ச்சத் தேவையில்லை.", adv_humid: "அதிக ஈரப்பதம். மண் ஈரமாக உள்ளது.", adv_heat: "அதிக வெப்பம்! தாராளமாக நீர் பாய்ச்சவும்.", adv_std: "வழக்கமான நீர்ப்பாசனம் பரிந்துரைக்கப்படுகிறது.", adv_clear_drain: "வடிகால்களை சுத்தம் செய்யவும்.", adv_fungal: "பூஞ்சை நோய்களைக் கண்காணிக்கவும்.", adv_mulch: "மண்ணில் மூடாக்கு போடவும்.", adv_weed: "களை கட்டுப்பாடு பரிந்துரைக்கப்படுகிறது."
  }
};

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } } };

// --- DATA ---
const cropAdviceDB = {
    "General": ["Maintain soil moisture levels.", "Check for local pests.", "Weed regularly."],
    "Rice": ["Maintain 5cm standing water.", "Apply Nitrogen in split doses.", "Watch for Stem Borer."],
    "Wheat": ["Irrigate at Crown Root Initiation.", "Avoid waterlogging at flowering.", "Check for Yellow Rust."],
    "Sugarcane": ["Heavy irrigation every 10 days.", "Trash mulching saves moisture.", "Earthing up prevents lodging."],
    "Cotton": ["Do not let water stagnate.", "Monitor for Pink Bollworm.", "Drain excess water after rain."],
    "Maize": ["Sensitive to drought & waterlogging.", "Irrigate at tasseling stage.", "Watch for Fall Armyworm."]
};

const organizationsList = [
    { id: 1, name: "NABARD", type: "Grant", desc: "Agri-Infrastructure Fund", amount: "₹2,00,000" },
    { id: 2, name: "SBI Kisan Loan", type: "Loan", desc: "Low interest crop loan (4%)", amount: "₹3,00,000" },
    { id: 3, name: "PM Fasal Bima", type: "Insurance", desc: "Crop insurance scheme", amount: "Coverage" },
    { id: 4, name: "Krishi Vigyan", type: "Subsidy", desc: "Solar Pump Subsidy (80%)", amount: "Subsidy" },
];

const connectList = [
    { id: 1, name: "Ramesh Kumar", loc: "Mandya, KA", mutual: "3 Mutual" },
    { id: 2, name: "Suresh Patil", loc: "Belagavi, KA", mutual: "1 Mutual" },
    { id: 3, name: "Anita Singh", loc: "Punjab", mutual: "New" },
    { id: 4, name: "Rajesh Kooth", loc: "Kerala", mutual: "5 Mutual" },
];

const clusterList = [
    { id: 1, name: "Organic Growers", members: 240, type: "WhatsApp" },
    { id: 2, name: "Paddy Farmers Assc", members: 1500, type: "Discord" },
    { id: 3, name: "Millet Mission", members: 450, type: "Community" },
    { id: 4, name: "Drone Farming Tech", members: 120, type: "Group" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [lang, setLang] = useState('en');

  const [city, setCity] = useState('');
  const [result, setResult] = useState(null);
  const [news, setNews] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [graphMode, setGraphMode] = useState('temp');
  const [view, setView] = useState('dashboard');
  
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);
  const chartRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(0);

  const [activeModal, setActiveModal] = useState(null); 
  const [selectedCrop, setSelectedCrop] = useState("General");

  const t = translations[lang];

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileRef]);

  // Auth Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    try {
      // ✅ USING DYNAMIC URL FOR VERCEL
      const res = await axios.post(`${API_URL}${endpoint}`, { username, password, language: lang });
      if (res.data.success) {
        setUser(res.data.user);
        
        if (authMode === 'register') {
            setLang(lang); 
        } else {
            setLang(res.data.user.language || 'en');
        }
        
        if(res.data.user.location) {
           setCity(res.data.user.location);
           fetchNews(res.data.user.location); 
        } else { fetchNews(); }
        fetchHistory(res.data.user._id);
      }
    } catch (error) { 
        console.error("Auth Error:", error);
        if (error.response) {
            alert(`Error: ${error.response.data.error || "Request failed"}`); 
        } else {
            alert("Server is not responding. Ensure 'node server.js' is running in backend folder.");
        }
    }
  };

  const handleLogout = () => { setUser(null); setResult(null); setHistory([]); setUsername(''); setPassword(''); setShowProfile(false); };
  
  useEffect(() => { if (user) getUserLocation(); }, [user]);

  const fetchNews = async (locationQuery = '') => {
    try {
        const query = locationQuery || city || 'Agriculture';
        // ✅ USING DYNAMIC URL
        const res = await axios.get(`${API_URL}/api/news?city=${query}`);
        setNews(res.data);
    } catch (e) { console.error("News fetch failed"); }
  };
  
  useEffect(() => { if (city && view === 'news') fetchNews(city); }, [city, view]);

  const processForecastData = (forecastRaw) => {
    if (!Array.isArray(forecastRaw)) return [];
    return forecastRaw.map(item => ({
      ...item, rain: Number(item.rain || 0), humidity: Number(item.humidity || 0), temp: Number(item.temp || 0), time: item.time || '', date: item.date || '', desc: item.desc || '', iconCode: item.iconCode || '01d'
    }));
  };

  const getWeatherClass = () => {
    if (!result) return 'app-container default-mode';
    const condition = (result.condition || '').toLowerCase();
    if (condition.includes('rain')) return 'app-container rain-mode';
    if (condition.includes('clear')) return 'app-container sunny-mode';
    if (condition.includes('cloud')) return 'app-container cloud-mode';
    return 'app-container default-mode';
  };

  const getWeatherIcon = (condition) => {
    if (!condition) return <Zap size={40} />;
    const c = condition.toLowerCase();
    if (c.includes('mist') || c.includes('fog') || c.includes('haze')) return <CloudFog size={60} color="#ccc" />;
    if (c.includes('rain')) return <CloudRain size={60} color="#fff" />;
    if (c.includes('clear')) return <Sun size={60} color="#ffd700" />;
    if (c.includes('cloud')) return <Cloud size={60} color="#fff" />;
    return <Wind size={60} color="#fff" />;
  };

  const getIconByCode = (code) => {
    const isDay = code.endsWith('d'); 
    if (code.startsWith('01')) return isDay ? <Sun size={24} color="#ffd700" /> : <Moon size={24} color="#fff" />;
    if (isDay && (code.startsWith('02') || code.startsWith('03') || code.startsWith('04'))) return <CloudSun size={24} color="#ffd700" />;
    if (!isDay && (code.startsWith('02') || code.startsWith('03') || code.startsWith('04'))) return <Cloud size={24} color="#ccc" />;
    if (code.startsWith('09') || code.startsWith('10')) return <CloudRain size={24} color="#00d4ff" />;
    if (code.startsWith('50')) return <CloudFog size={24} color="#ccc" />;
    return isDay ? <Sun size={24} color="#ffd700" /> : <Moon size={24} color="#fff" />;
  };

  const getBottomIcon = (item) => {
    if (graphMode === 'rain') return item.rain > 0 ? <CloudRain size={24} color="#00d4ff" /> : <Cloud size={24} color="#ccc" />;
    if (graphMode === 'humidity') return <Droplets size={24} color="#ff7e5f" />;
    return getIconByCode(item.iconCode || '01d');
  };

  useEffect(() => {
    if (chartRef.current) {
        const resizeObserver = new ResizeObserver((entries) => {
            if (entries[0].contentRect.width > 0) setChartWidth(entries[0].contentRect.width);
        });
        resizeObserver.observe(chartRef.current);
        return () => resizeObserver.disconnect();
    }
  }, [result, view]);

  const getUserLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => { checkIrrigation(null, position.coords.latitude, position.coords.longitude); },
        (error) => { setLoading(false); if(!user?.location) alert("Location Access Denied. Please enable GPS."); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else { setLoading(false); alert("Geolocation is not supported."); }
  };

  const fetchHistory = async (uid) => {
    if (!uid) return;
    try {
      // ✅ USING DYNAMIC URL
      const response = await axios.get(`${API_URL}/api/history/${uid}`);
      setHistory(response.data);
    } catch (error) { console.error("Backend not connected"); }
  };

  const deleteHistoryItem = async (id) => {
    if(!id) return;
    try {
      // ✅ USING DYNAMIC URL
      await axios.delete(`${API_URL}/api/history/${id}`);
      setHistory(prev => prev.filter(item => item._id !== id));
    } catch (error) { alert("Error deleting item"); }
  };

  const checkIrrigation = async (manualCity = null, lat = null, lon = null) => {
    const queryCity = manualCity || city;
    if (!queryCity && !lat) return;

    setLoading(true);
    try {
      const payload = lat ? { lat, lon, userId: user?._id } : { city: queryCity, userId: user?._id };
      // ✅ USING DYNAMIC URL
      const response = await axios.post(`${API_URL}/api/check-irrigation`, payload);
      
      let forecast = response.data.forecast || [];
      if(forecast.length > 0) forecast = processForecastData(forecast);
      
      setResult({ ...response.data, forecast });
      if(lat) {
         setCity(response.data.city);
         fetchNews(response.data.city);
      }
      if(user) fetchHistory(user._id);
    } catch (error) { alert("Error: Could not fetch weather."); }
    setLoading(false);
  };

  const getGraphConfig = () => {
    const defaultData = (result?.forecast || []).slice(0, 9);
    switch(graphMode) {
      case 'rain': return { color: '#00d4ff', key: 'rain', unit: '%', data: defaultData };
      case 'humidity': return { color: '#ff7e5f', key: 'humidity', unit: '%', data: defaultData }; 
      default: return { color: '#ffd700', key: 'temp', unit: '°', data: defaultData };
    }
  };
  const graphConfig = getGraphConfig();

  const renderModal = () => {
    if(!activeModal) return null;
    return (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="modal-overlay" onClick={()=>setActiveModal(null)}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}} className="modal-content" onClick={e=>e.stopPropagation()}>
                <button className="modal-close" onClick={()=>setActiveModal(null)}><X size={24}/></button>
                {activeModal === 'org' && (
                    <>
                        <h2 className="modal-title"><Landmark /> Funding & Loans</h2>
                        <div className="list-container">
                            {organizationsList.map(item => (
                                <div key={item.id} className="list-item">
                                    <div className="list-avatar" style={{background: 'rgba(0,212,255,0.2)', color: '#00d4ff'}}>₹</div>
                                    <div className="list-info"><h4>{item.name}</h4><p>{item.type} • {item.desc}</p></div>
                                    <button className="btn-action primary">{item.amount}</button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                {activeModal === 'invite' && (
                    <>
                        <h2 className="modal-title"><Users /> Farmers Nearby</h2>
                        <div className="list-container">
                            {connectList.map(item => (
                                <div key={item.id} className="list-item">
                                    <div className="list-avatar">{item.name.charAt(0)}</div>
                                    <div className="list-info"><h4>{item.name}</h4><p>{item.loc} • {item.mutual}</p></div>
                                    <button className="btn-action"><UserPlus size={16}/> Connect</button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                {activeModal === 'cluster' && (
                    <>
                        <h2 className="modal-title"><MessageSquare /> Farming Clusters</h2>
                        <div className="list-container">
                            {clusterList.map(item => (
                                <div key={item.id} className="list-item">
                                    <div className="list-avatar" style={{background: '#25D366', color: 'white'}}><MessageSquare size={18}/></div>
                                    <div className="list-info"><h4>{item.name}</h4><p>{item.members} members • {item.type}</p></div>
                                    <button className="btn-action primary">Join</button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </motion.div>
        </motion.div>
    );
  };

  if (!user) {
    return (
      <div className="app-container default-mode auth-screen">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="auth-card">
           <div className="logo auth-logo" style={{justifyContent: 'center'}}><Zap size={40} fill="currentColor" /> {t.appTitle}</div>
           <h2 style={{marginBottom: '20px'}}>{authMode === 'login' ? t.login : t.register}</h2>
           <div className="auth-lang-toggle">
             <button onClick={() => setLang('en')} className={`lang-btn ${lang==='en'?'active':''}`}>EN</button>
             <button onClick={() => setLang('hi')} className={`lang-btn ${lang==='hi'?'active':''}`}>HI</button>
             <button onClick={() => setLang('kn')} className={`lang-btn ${lang==='kn'?'active':''}`}>KN</button>
             <button onClick={() => setLang('te')} className={`lang-btn ${lang==='te'?'active':''}`}>TE</button>
             <button onClick={() => setLang('ml')} className={`lang-btn ${lang==='ml'?'active':''}`}>ML</button>
             <button onClick={() => setLang('ta')} className={`lang-btn ${lang==='ta'?'active':''}`}>TA</button>
           </div>
           <form onSubmit={handleAuth}>
             <input type="text" placeholder={t.username} value={username} onChange={e=>setUsername(e.target.value)} required />
             <input type="password" placeholder={t.password} value={password} onChange={e=>setPassword(e.target.value)} required />
             <button type="submit" className="btn-auth">{t.submit}</button>
           </form>
           <p className="switch-auth" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
             {authMode === 'login' ? "New user? Register" : "Already have an account? Login"}
           </p>
        </motion.div>
      </div>
    );
  }

  const DashboardView = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="dashboard-container">
      <div className="dashboard-left">
        <motion.div variants={itemVariants} className={`status-card ${result.irrigate ? 'water-glow' : 'dry-glow'}`}>
          <div className="weather-icon-large">{getWeatherIcon(result.condition)}</div>
          <div className="main-temp animate-float">{Math.round(result.temperature)}°C</div>
          <div className="condition-badge">{result.condition}</div>
          <h2 className="action-title">{result.irrigate ? t.waterNow : t.doNotWater}</h2>
          <p className="action-desc">{getTranslatedAdvice(result.advice, t)}</p>
          <div className="grid-stats">
            <div className="stat-box"><Droplets size={20} className="icon-blue"/> {result.humidity}% {t.humidity}</div>
            <div className="stat-box"><CloudRain size={20} style={{ color: '#00d4ff' }} /> {result.forecast && result.forecast[0] ? result.forecast[0].rain : 0}% {t.precip}</div>
            <div className="stat-box"><MapPin size={20} className="icon-red"/> {result.city}</div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="info-card small-card">
          <h4 className="card-title"><Calendar size={18} /> {t.lookingAhead}</h4>
          <p className="looking-ahead-text">
              {result.forecast && result.forecast[4] && result.forecast[4].rain > 20 
                ? `Expect rain around ${result.forecast[4].time}.` 
                : "Conditions expected to remain mostly clear."}
          </p>
        </motion.div>

        {result.suggestions && (
           <motion.div variants={itemVariants} className="info-card suggestion-card">
             <div className="card-header" style={{border: 'none', paddingBottom: 0, marginBottom: '10px'}}>
                 <h4 className="card-title"><Sprout size={18} className="icon-green"/> {t.cropTips}</h4>
                 <select className="crop-select" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
                    {Object.keys(cropAdviceDB).map(crop => <option key={crop} value={crop}>{crop}</option>)}
                 </select>
             </div>
             <ul className="suggestion-list">
               {result.suggestions.slice(0, 1).map((tip, i) => <li key={`g-${i}`}>{getTranslatedAdvice(tip, t)}</li>)}
               {cropAdviceDB[selectedCrop].map((tip, i) => <li key={`c-${i}`} style={{borderColor: '#ffd700'}}>{tip}</li>)}
             </ul>
           </motion.div>
        )}

        <motion.div variants={itemVariants} className="info-card map-card">
           <h4 className="card-title"><MapIcon size={18} /> {t.farmLocation || "FARM LOCATION"}</h4>
           <div className="map-wrapper" style={{ height: '300px', borderRadius: '12px', overflow: 'hidden' }}>
              {result.coord ? (
                 <MapContainer center={[result.coord.lat, result.coord.lon]} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
                    <Marker position={[result.coord.lat, result.coord.lon]}><Popup>Your Farm</Popup></Marker>
                    {result.nearby && result.nearby.map((city) => (
                      <Marker key={city.id} position={[city.lat, city.lon]} icon={createWeatherIcon(city.icon)}>
                        <Popup><b>{city.name}</b><br/>{city.temp}°C, {city.condition}</Popup>
                      </Marker>
                    ))}
                 </MapContainer>
              ) : ( <div className="map-placeholder"><MapIcon size={32} color="#666" /><p>Location Map</p></div> )}
           </div>
        </motion.div>
      </div>

      <div className="dashboard-right">
        <motion.div variants={itemVariants} className="info-card today-summary">
          <div className="card-header">
              <h4 className="card-title"><Sun size={18}/> {t.todayWeather}</h4>
              <span className="today-date">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="summary-grid">
              <div className="summary-item">
                 {getWeatherIcon(result.condition)}
                 <div className="summary-text"><span className="summary-desc">{t.currentConditions}</span><span className="summary-val">Hi: {Math.round(result.temperature + 2)}°</span></div>
              </div>
              <div className="summary-item">
                 <Moon size={32} color="#ccc" />
                 <div className="summary-text"><span className="summary-desc">{t.tonight}</span><span className="summary-val">Lo: {Math.round(result.temperature - 5)}°</span></div>
              </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="info-card current-details">
           <div className="card-header"><h4 className="card-title"><Activity size={18}/> {t.currentWeather}</h4><span className="current-time">{new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span></div>
           <div className="details-row">
              <div className="detail-main">
                 {getWeatherIcon(result.condition)}
                 <div className="detail-temp-grp"><span className="detail-temp">{Math.round(result.temperature)}°</span><span className="detail-feel">RealFeel® {Math.round(result.temperature + 1)}°</span></div>
                 <div className="detail-phrase">{result.condition}</div>
              </div>
              <div className="detail-grid">
                 <div className="detail-item"><span className="d-label">{t.wind}</span><span className="d-val">{(result.windSpeed ? (result.windSpeed * 3.6).toFixed(1) : 0)} km/h</span></div>
                 <div className="detail-item"><span className="d-label">{t.windGusts}</span><span className="d-val">{(result.windGust ? (result.windGust * 3.6).toFixed(1) : '--')} km/h</span></div>
                 <div className="detail-item"><span className="d-label">{t.airQuality}</span><span className="d-val green">Fair</span></div>
              </div>
           </div>
        </motion.div>

        <motion.div variants={itemVariants} className="graph-card">
          <div className="card-header" style={{border: 'none', marginBottom: 0}}>
            <h4 className="card-title"><BarChart2 size={18}/> Analysis</h4>
             <div className="graph-tabs">
                <button className={graphMode === 'temp' ? 'active' : ''} onClick={() => setGraphMode('temp')}>Temp</button>
                <button className={graphMode === 'rain' ? 'active' : ''} onClick={() => setGraphMode('rain')}>Precip</button>
                <button className={graphMode === 'humidity' ? 'active' : ''} onClick={() => setGraphMode('humidity')}>Humid</button>
            </div>
          </div>
          <div className="chart-area" ref={chartRef}>
            {chartWidth > 0 && graphConfig.data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
              {graphMode === 'rain' ? (
                  <BarChart data={graphConfig.data}><Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px'}} /><Bar dataKey="rain" fill="#00d4ff" radius={[4, 4, 0, 0]} barSize={30} /></BarChart>
              ) : (
                  <AreaChart data={graphConfig.data}>
                    <defs><linearGradient id={`color${graphMode}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={graphConfig.color} stopOpacity={0.5}/><stop offset="95%" stopColor={graphConfig.color} stopOpacity={0}/></linearGradient></defs>
                    <Tooltip contentStyle={{backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px'}} itemStyle={{color: '#fff'}} formatter={(value) => [`${value}${graphConfig.unit}`, graphConfig.key]} />
                    <Area type="monotone" dataKey={graphConfig.key} stroke={graphConfig.color} strokeWidth={3} fillOpacity={1} fill={`url(#color${graphMode})`} />
                  </AreaChart>
              )}
              </ResponsiveContainer>
            ) : ( <div className="chart-loading">Loading Chart...</div> )}
          </div>
          <div className="forecast-strip">
            {graphConfig.data.map((item, index) => (
              <div key={index} className="forecast-item">
                <span className="f-time">{item.time.replace(':00', '')}</span>
                <div className="f-icon-wrapper">{getBottomIcon(item)}</div>
                <span className="f-val">{graphMode === 'temp' ? `${item.temp}°` : graphMode === 'rain' ? `${item.rain}%` : `${item.humidity}%`}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );

  const HourlyView = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="hourly-container">
      <h2 className="page-title">{t.hourly}</h2>
      <motion.div className="hourly-list" variants={containerVariants}>
        {result.forecast.map((item, index) => (
          <motion.div variants={itemVariants} key={index} className="hourly-row" whileHover={{ scale: 1.02, x: 10, backgroundColor: "rgba(255,255,255,0.1)" }}>
            <div className="hr-time-col"><span className="hr-time">{item.time}</span><span className="hr-date">{item.date}</span></div>
            <div className="hr-icon-col">{getIconByCode(item.iconCode)}<span className="hr-desc">{item.desc}</span></div>
            <div className="hr-data-col">
              <span className="hr-temp">{item.temp}°</span>
              <div className="hr-detail"><CloudRain size={16} color="#00d4ff"/> {item.rain}%</div>
              <div className="hr-detail"><Droplets size={16} color="#ff7e5f"/> {item.humidity}%</div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );

  const NewsView = () => (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="news-container">
        <div className="news-header">
          <h2 className="page-title">{t.news}</h2>
          <span className="news-location-badge">📍 News for {city || 'Your Region'}</span>
        </div>
        <div className="news-grid">
          {news.length > 0 ? news.map(item => (
            <motion.div variants={itemVariants} key={item.id} className="news-card" onClick={() => window.open(item.url, '_blank')}>
               <div className="news-img" style={{backgroundImage: `url(${item.image})`}}></div>
               <div className="news-content">
                  <span className="news-source">{item.source} • {item.time}</span>
                  <h3 className="news-title">{item.title}</h3>
                  <div className="news-link">Read Story <ArrowRight size={14}/></div>
               </div>
            </motion.div>
          )) : ( <p className="loading-text">Fetching latest agriculture news...</p> )}
        </div>
      </motion.div>
  );

  return (
    <div className={getWeatherClass()}>
      <div className="weather-overlay"></div>
      <AnimatePresence>{activeModal && renderModal()}</AnimatePresence>

      <nav className="navbar">
        <div className="logo"><Zap size={24} fill="currentColor" color="#00d4ff" /> <span>{t.appTitle}</span></div>
        <div className="nav-links">
          <button className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}><BarChart2 size={18} /> {t.dashboard}</button>
          <button className={`nav-item ${view === 'hourly' ? 'active' : ''}`} onClick={() => setView('hourly')}><Calendar size={18} /> {t.hourly}</button>
          <button className={`nav-item ${view === 'news' ? 'active' : ''}`} onClick={() => { setView('news'); fetchNews(city); }}><Newspaper size={18} /> {t.news}</button>
        </div>
        
        {/* --- NAVBAR RIGHT: LANGUAGE & PROFILE --- */}
        <div className="nav-right" ref={profileRef}>
            {/* Language Switcher inside Dashboard */}
            <div className="nav-lang-toggle">
               <button onClick={() => setLang('en')} className={`lang-btn ${lang==='en'?'active':''}`}>EN</button>
               <button onClick={() => setLang('hi')} className={`lang-btn ${lang==='hi'?'active':''}`}>HI</button>
               <button onClick={() => setLang('kn')} className={`lang-btn ${lang==='kn'?'active':''}`}>KN</button>
               <button onClick={() => setLang('te')} className={`lang-btn ${lang==='te'?'active':''}`}>TE</button>
               <button onClick={() => setLang('ml')} className={`lang-btn ${lang==='ml'?'active':''}`}>ML</button>
               <button onClick={() => setLang('ta')} className={`lang-btn ${lang==='ta'?'active':''}`}>TA</button>
            </div>

            <div className="profile-container" onClick={() => setShowProfile(!showProfile)}>
                <div className="profile-avatar">{user.username.charAt(0).toUpperCase()}</div>
                <span className="profile-name-nav">{user.username}</span>
                <ChevronDown size={16} className={`profile-chevron ${showProfile ? 'rotate' : ''}`} />
            </div>

            <AnimatePresence>
                {showProfile && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="profile-dropdown">
                        <div className="profile-header">
                            <div className="profile-avatar-large">{user.username.charAt(0).toUpperCase()}</div>
                            <div className="profile-info"><h3 className="profile-dropdown-name">{user.username}</h3><p className="profile-dropdown-email">{user.username.toLowerCase()}@example.com</p></div>
                        </div>
                        <button className="profile-btn-manage">Manage Account</button>
                        <div className="profile-divider"></div>
                        <ul className="profile-menu-list">
                            <li className="profile-menu-item" onClick={() => { setActiveModal('org'); setShowProfile(false); }}><Landmark size={16} /> Organizations</li>
                            <li className="profile-menu-item" onClick={() => { setActiveModal('cluster'); setShowProfile(false); }}><Settings size={16} /> All Clusters</li>
                            <li className="profile-menu-item" onClick={() => { setActiveModal('invite'); setShowProfile(false); }}><Bell size={16} /> Invitations</li>
                            <li className="profile-menu-item"><MessageSquare size={16} /> Send Feedback</li>
                        </ul>
                        <div className="profile-divider"></div>
                        <div className="profile-logout-section" onClick={handleLogout}><LogOut size={16} /> Log out</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </nav>

      <div className="main-content">
        {view === 'dashboard' && (
          <header className="hero-section">
            <h1>{t.subTitle}</h1>
            <p>Your daily AI & Agriculture news hub. Aggregating the latest from 10 premium sources.</p>
            <div className="search-wrapper">
              <Search className="search-icon" color="#666" />
              <input type="text" placeholder={t.searchPlaceholder} value={city} onChange={(e) => setCity(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && checkIrrigation()} />
              <button onClick={() => checkIrrigation()} disabled={loading}>{loading ? "..." : t.checkNow}</button>
            </div>
          </header>
        )}

        <AnimatePresence mode="wait">
          {view === 'news' ? ( <NewsView key="news" /> ) : result ? ( view === 'dashboard' ? <DashboardView key="dash" /> : <HourlyView key="hourly" /> ) : ( <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="empty-state"></motion.div> )}
        </AnimatePresence>
        
        {view === 'dashboard' && history.length > 0 && (
           <div className="history-section">
             <h3>{t.recentActivity}</h3>
             <div className="history-grid">
               {history.map((item) => (
                  <motion.div whileHover={{y: -5}} key={item._id} className="history-card">
                      <div className="history-top">
                         <span className="h-city">{item.city === "Kānkānhalli" ? "Kanakapura" : item.city}</span>
                         <button onClick={()=>deleteHistoryItem(item._id)} className="btn-delete"><Trash2 size={14}/></button>
                      </div>
                      <div className="h-mid"><span className="h-temp">{Math.round(item.temperature)}°</span></div>
                      <div className={`h-status ${item.irrigate?'blue':'red'}`}>{item.irrigate ? t.water : t.skip}</div>
                  </motion.div>
               ))}
             </div>
           </div>
        )}
      </div>
    </div>
  );
}