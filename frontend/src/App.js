/* global __firebase_config, __initial_auth_token, __app_id */
import React, { useState, useEffect } from 'react';

const App = () => {
    // State variables for user inputs and AI-generated news
    const [country, setCountry] = useState('USA');
    const [newsType, setNewsType] = useState('General');
    const [generatedNews, setGeneratedNews] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Firebase state for potential future backend integration
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);

    // Initialize Firebase and authenticate
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // Check if Firebase is available (Canvas environment)
                if (typeof window.firebase === 'undefined') {
                    console.warn("Firebase not available in this environment. Skipping Firebase initialization.");
                    return;
                }

                const { initializeApp } = window.firebase;
                const { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } = window.firebase.auth;
                const { getFirestore } = window.firebase.firestore;

                // Ensure firebaseConfig is parsed correctly
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id'; // Fallback appId

                if (firebaseConfig) {
                    const app = initializeApp(firebaseConfig);
                    const firestoreDb = getFirestore(app);
                    const firebaseAuth = getAuth(app);

                    setDb(firestoreDb);
                    setAuth(firebaseAuth);

                    onAuthStateChanged(firebaseAuth, async (user) => {
                        if (user) {
                            setUserId(user.uid);
                            console.log("Firebase Authenticated User ID:", user.uid);
                        } else {
                            if (initialAuthToken) {
                                console.log("Signing in with custom token...");
                                await signInWithCustomToken(firebaseAuth, initialAuthToken);
                            } else {
                                console.log("Signing in anonymously...");
                                await signInAnonymously(firebaseAuth);
                            }
                        }
                    });
                } else {
                    console.error("Firebase config not found. Firebase features will not be available.");
                }
            } catch (error) {
                console.error("Error initializing Firebase:", error);
                setErrorMessage("Failed to initialize Firebase. Some features may not work.");
            }
        };

        initializeFirebase();
    }, []); // Run only once on component mount

    // Function to call the Gemini API for news generation
    const generateAINews = async () => {
        setIsLoading(true);
        setErrorMessage('');
        setGeneratedNews([]); // Clear previous news

        const prompt = `Generate a concise, interesting news article about ${newsType} in ${country}. The article should have a headline and a body paragraph. Focus on a current or plausible event related to that type and country. Make it sound like a real news report.`;

        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = {
            contents: chatHistory,
            generationConfig: {
                // Request a structured JSON response for easier parsing
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        "headline": { "type": "STRING" },
                        "body": { "type": "STRING" },
                        "imageUrl": { "type": "STRING" } // Placeholder for image URL, could be a generated one
                    },
                    "propertyOrdering": ["headline", "body", "imageUrl"]
                }
            }
        };

        const apiKey = "AIzaSyB7aK2OmdQbhXVZr8zqEumTWmIjkw4ov2Y"; // Canvas will automatically provide the API key at runtime
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`);
            }

            const result = await response.json();
            console.log("AI Generation Result:", result);

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const jsonText = result.candidates[0].content.parts[0].text;
                try {
                    const parsedNews = JSON.parse(jsonText);
                    setGeneratedNews([parsedNews]); // Store as an array, even if one article
                } catch (parseError) {
                    console.error("Failed to parse AI response as JSON:", parseError);
                    setErrorMessage("AI generated malformed JSON. Please try again.");
                }
            } else {
                setErrorMessage("No content generated by AI. Please try again.");
            }
        } catch (error) {
            console.error("Error generating AI news:", error);
            setErrorMessage(`Failed to generate news: ${error.message}. Please check console for details.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 font-sans text-gray-800 p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            <header className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6 mb-8 text-center border-b-4 border-indigo-500 animate-fade-in-down">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-indigo-700 leading-tight">
                    <span className="block">GlobalPulse AI</span>
                    <span className="text-2xl sm:text-3xl font-semibold text-gray-500 mt-2">Your Personalized News Feed</span>
                </h1>
                {userId && (
                    <div className="mt-4 text-sm text-gray-600">
                        <p>User ID: <span className="font-mono bg-gray-100 p-1 rounded-md">{userId}</span></p>
                    </div>
                )}
            </header>

            {/* AI News Generation Section */}
            <section className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6 mb-8 transform transition-all duration-300 hover:shadow-xl animate-fade-in-up">
                <h2 className="text-3xl font-bold text-indigo-600 mb-6 text-center">Generate AI News</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label htmlFor="country" className="block text-gray-700 text-lg font-medium mb-2">Select Country:</label>
                        <select
                            id="country"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg appearance-none bg-white bg-no-repeat bg-right-center pr-10"
                            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd'/%3E%3C/svg%3E\")", backgroundSize: "1.5rem" }}
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                        >
                            <option value="USA">USA</option>
                            <option value="UK">UK</option>
                            <option value="Canada">Canada</option>
                            <option value="Australia">Australia</option>
                            <option value="Germany">Germany</option>
                            <option value="Japan">Japan</option>
                            <option value="India">India</option>
                            <option value="Brazil">Brazil</option>
                            <option value="France">France</option>
                            <option value="China">China</option>
                            <option value="UAE">UAE</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="newsType" className="block text-gray-700 text-lg font-medium mb-2">Select News Type:</label>
                        <select
                            id="newsType"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg appearance-none bg-white bg-no-repeat bg-right-center pr-10"
                            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'%3E%3Cpath fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd'/%3E%3C/svg%3E\")", backgroundSize: "1.5rem" }}
                            value={newsType}
                            onChange={(e) => setNewsType(e.target.value)}
                        >
                            <option value="General">General</option>
                            <option value="Sports">Sports</option>
                            <option value="Politics">Politics</option>
                            <option value="Technology">Technology</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Business">Business</option>
                            <option value="Health">Health</option>
                            <option value="Science">Science</option>
                            <option value="World">World</option>
                            <option value="Local">Local</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={generateAINews}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg text-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300 animate-bounce-once"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating News...
                        </div>
                    ) : (
                        'Generate AI News'
                    )}
                </button>

                {errorMessage && (
                    <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center font-medium animate-fade-in">
                        {errorMessage}
                    </div>
                )}
            </section>

            {/* Display AI-Generated News */}
            {generatedNews.length > 0 && (
                <section className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl animate-fade-in">
                    <h2 className="text-3xl font-bold text-indigo-600 mb-6 text-center">AI-Generated Articles</h2>
                    <div className="space-y-8">
                        {generatedNews.map((article, index) => (
                            <div key={index} className="flex flex-col md:flex-row bg-gray-50 rounded-xl shadow-md overflow-hidden transition-transform duration-300 hover:scale-[1.01]">
                                {article.imageUrl && (
                                    <div className="md:w-1/3 flex-shrink-0">
                                        <img
                                            src={article.imageUrl}
                                            alt={article.headline}
                                            className="w-full h-48 md:h-full object-cover rounded-t-xl md:rounded-l-xl md:rounded-tr-none"
                                            onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x300/a78bfa/ffffff?text=AI+News`; }}
                                        />
                                    </div>
                                )}
                                <div className="p-6 flex flex-col justify-between md:w-2/3">
                                    <div>
                                        <h3 className="text-2xl font-semibold text-gray-900 mb-3 leading-tight">{article.headline}</h3>
                                        <p className="text-gray-700 leading-relaxed text-base mb-4">{article.body}</p>
                                    </div>
                                    <div className="text-sm text-gray-500 mt-4">
                                        Generated by AI | {new Date().toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Placeholder for Top News (would come from a real news API via Flask) */}
         {/*<section className="w-full max-w-4xl mt-8 bg-white rounded-xl shadow-lg p-6 animate-fade-in-up-delay">*/}
         {/*       <h2 className="text-3xl font-bold text-indigo-600 mb-6 text-center">Today's Top Headlines (Placeholder)</h2>*/}
         {/*       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">*/}
         {/*           {[1, 2, 3, 4].map((item) => (*/}
         {/*               <div key={item} className="bg-gray-50 p-5 rounded-lg shadow-sm border border-gray-100 transition-transform duration-300 hover:scale-[1.01]">*/}
         {/*                   <img*/}
         {/*                       src={`https://placehold.co/600x400/9ca3af/ffffff?text=Top+News+Article+${item}`}*/}
         {/*                       alt={`Placeholder news image ${item}`}*/}
         {/*                       className="w-full h-40 object-cover rounded-lg mb-4"*/}
         {/*                   />*/}
         {/*                   <h3 className="text-xl font-semibold text-gray-800 mb-2"></h3>*/}
         {/*                   <p className="text-gray-600 text-sm"> </p>*/}
         {/*                   <a href="#" className="text-indigo-500 hover:text-indigo-700 font-medium mt-3 inline-block">Read More &rarr;</a>*/}
         {/*               </div>*/}
         {/*           ))}*/}
         {/*       </div>*/}
         {/*   </section> */}
        </div>
    );
};

export default App;
