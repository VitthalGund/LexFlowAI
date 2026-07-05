from app.core.config import settings
import httpx

MOCK_TRANSLATIONS = {
    "Update TLS to v1.3": {
        "kn": "ಎಲ್ಲಾ ಇಂಟರ್ನೆಟ್-ಫೇಸಿಂಗ್ ಎಂಡ್‌ಪಾಯಿಂಟ್‌ಗಳು TLS 1.3 ಅನ್ನು ಬಳಸಬೇಕು. ಇದರಲ್ಲಿ ವೆಬ್ ಬ್ಯಾಂಕಿಂಗ್ ಪೋರ್ಟಲ್‌ಗಳು, API ಗೇಟ್‌ವೇಗಳು ಮತ್ತು ಮೊಬೈಲ್ ಅಪ್ಲಿಕೇಶನ್ ಬ್ಯಾಕೆಂಡ್‌ಗಳು ಸೇರಿವೆ.",
        "ta": "அனைத்து இணையம் எதிர்கொள்ளும் முனைப்புள்ளிகளும் TLS 1.3 பயன்படுத்த வேண்டும். இதில் இணைய வங்கி இணையதளங்கள், API நுழைவாயில்கள் மற்றும் மொபைல் ஆப் பின்தளங்கள் அடங்கும்.",
        "ml": "എല്ലാ ഇന്റർനെറ്റ്-ഫേസിങ് എൻഡ്‌പോയിന്റുകളും TLS 1.3 ഉപയോഗിക്കണം. ഇതിൽ വെബ് ബാങ്കിംഗ് പോർട്ടലുകൾ, API ഗേറ്റ്‌വേകൾ, മൊബൈಲ್ ആപ്പ് ബാക്കെൻഡുകൾ എന്നിവ ഉൾപ്പെടുന്നു.",
        "hi": "सभी इंटरनेट-फेसिंग एंडपॉइंट्स पर TLS 1.3 का उपयोग करना आवश्यक है। इसमें वेब बैंकिंग पोर्टल, एपीआई गेटवे और मोबाइल ऐप बैकएंड शामिल हैं।"
    },
    "Enable MFA for Admin Accounts": {
        "kn": "ಎಲ್ಲಾ ನಿರ್ವಾಹಕ ಖಾತೆಗಳಿಗೆ MFA ಸಕ್ರಿಯಗೊಳಿಸಿ. ಸಿಸ್ಟಮ್ ಪ್ರವೇಶ ಲಾಗ್‌ಗಳ ಮೂಲಕ ಸಾಕ್ಷ್ಯವನ್ನು ಒದಗಿಸಬೇಕು.",
        "ta": "அனைத்து நிர்வாகி கணக்குகளுக்கும் MFA இயக்கவும். கணினி அணுகல் பதிவுகள் மூலம் சான்றுகள் வழங்கப்பட வேண்டும்.",
        "ml": "എല്ലാ അഡ്മിൻ അക്കൗണ്ടുകൾക്കും MFA പ്രാപ്തമാക്കുക. സിസ്റ്റം ആക്സಸ್ ലോഗുകൾ വഴി തെളിവ് നൽകണം.",
        "hi": "सभी व्यवस्थापक खातों के लिए MFA सक्षम करें। एक्सेस लॉग के माध्यम से साक्ष्य प्रदान किया जाना चाहिए।"
    },
    "Cybersecurity Awareness Training": {
        "kn": "ಎಲ್ಲಾ ಸಿಬ್ಬಂದಿ ಕಡ್ಡಾಯ ಸೈಬರ್ ಭದ್ರತಾ ತರಬೇತಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಬೇಕು.",
        "ta": "அனைத்து ஊழியர்களும் இணைய பாதுகாப்பு விழிப்புணர்வு பயிற்சியை முடிக்க வேண்டும்.",
        "ml": "എല്ലാ ജീവനക്കാരും നിർബന്ധിത സൈബർ സുരക്ഷാ പരിശീലനം പൂർത്തിയാക്കണം.",
        "hi": "सभी बैंक कर्मचारियों को साइबर सुरक्षा जागरूकता प्रशिक्षण पूरा करना होगा।"
    }
}

async def translate_text(text: str, title: str, lang: str) -> str:
    """
    Translates text to target language code using Gemini API.
    Falls back to pre-seeded dict or a mock label if API fails.
    """
    lang_names = {
        "kn": "Kannada",
        "ta": "Tamil",
        "ml": "Malayalam",
        "hi": "Hindi",
        "te": "Telugu",
        "mr": "Marathi"
    }
    
    target_language = lang_names.get(lang, lang)
    
    if settings.GEMINI_API_KEY:
        try:
            prompt = f"Translate the following text to {target_language}. Return ONLY the translated text without any quotes or explanations.\n\n{text}"
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key={settings.GEMINI_API_KEY}",
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"temperature": 0.1}
                    },
                    timeout=3.0
                )
                if response.status_code == 200:
                    data = response.json()
                    translated_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    return translated_text
        except Exception as e:
            print(f"Translation API Error: {e}")

    # Fallbacks if API fails or is not configured
    if title in MOCK_TRANSLATIONS and lang in MOCK_TRANSLATIONS[title]:
        return MOCK_TRANSLATIONS[title][lang]
        
    lang_labels = {
        "kn": "ಕನ್ನಡ",
        "ta": "தமிழ்",
        "ml": "മലയാളം",
        "hi": "हिंदी"
    }
    label = lang_labels.get(lang, target_language)
    return f"[{label} Translation of '{title}']: {text}"
