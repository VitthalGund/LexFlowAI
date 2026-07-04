import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Static offline dictionary for basic UI translation
const resources = {
  en: {
    translation: {
      "Dashboard": "Dashboard",
      "Ingest Circular": "Ingest Circular",
      "MAP Management": "MAP Management",
      "TrustVault Ledger": "TrustVault Ledger",
      "Risk Review Queue": "Risk Review Queue",
      "Compliance Tasks": "Compliance Tasks",
      "Active User": "Active User",
      "Sign Out": "Sign Out",
      "Compliance Command Center": "Compliance Command Center",
      "Compliance Officer Workspace": "Compliance Officer Workspace",
      "Real-time cryptographic audit coverage for Canara Bank regional networks.": "Real-time cryptographic audit coverage for Canara Bank regional networks.",
      "Refresh Feed": "Refresh Feed",
      "Compliance Rate": "Compliance Rate",
      "Active Circulars": "Active Circulars",
      "Outstanding MAPs": "Outstanding MAPs",
      "Quarantined Uploads": "Quarantined Uploads",
      "Geographic Compliance Heatmap": "Geographic Compliance Heatmap",
      "BehaviorGuard Risk Alerts": "BehaviorGuard Risk Alerts",
      "Active MAPs Audit Trail": "Active MAPs Audit Trail"
    }
  },
  hi: {
    translation: {
      "Dashboard": "डैशबोर्ड",
      "Ingest Circular": "परिपत्र दर्ज करें",
      "MAP Management": "मैप प्रबंधन",
      "TrustVault Ledger": "ट्रस्टवॉल्ट लेजर",
      "Risk Review Queue": "जोखिम समीक्षा",
      "Compliance Tasks": "अनुपालन कार्य",
      "Active User": "सक्रिय उपयोगकर्ता",
      "Sign Out": "साइन आउट",
      "Compliance Command Center": "अनुपालन कमांड सेंटर",
      "Compliance Officer Workspace": "अनुपालन अधिकारी कार्यक्षेत्र",
      "Real-time cryptographic audit coverage for Canara Bank regional networks.": "केनरा बैंक क्षेत्रीय नेटवर्क के लिए वास्तविक समय क्रिप्टोग्राफिक ऑडिट कवरेज।",
      "Refresh Feed": "फ़ीड रीफ्रेश करें",
      "Compliance Rate": "अनुपालन दर",
      "Active Circulars": "सक्रिय परिपत्र",
      "Outstanding MAPs": "बकाया मैप",
      "Quarantined Uploads": "संगरोधित अपलोड",
      "Geographic Compliance Heatmap": "भौगोलिक अनुपालन हीटमैप",
      "BehaviorGuard Risk Alerts": "बिहेवियरगार्ड जोखिम अलर्ट",
      "Active MAPs Audit Trail": "सक्रिय मैप ऑडिट ट्रेल"
    }
  },
  kn: {
    translation: {
      "Dashboard": "ಡ್ಯಾಶ್ಬೋರ್ಡ್",
      "Ingest Circular": "ಸುತ್ತೋಲೆ ಸೇರಿಸಿ",
      "MAP Management": "ಮ್ಯಾಪ್ ನಿರ್ವಹಣೆ",
      "TrustVault Ledger": "ಟ್ರಸ್ಟ್ವಾಲ್ಟ್ ಲೆಡ್ಜರ್",
      "Risk Review Queue": "ಅಪಾಯದ ವಿಮರ್ಶೆ",
      "Compliance Tasks": "ಅನುಸರಣೆ ಕಾರ್ಯಗಳು",
      "Active User": "ಸಕ್ರಿಯ ಬಳಕೆದಾರ",
      "Sign Out": "ಸೈನ್ ಔಟ್",
      "Compliance Command Center": "ಅನುಸರಣೆ ಕಮಾಂಡ್ ಸೆಂಟರ್",
      "Compliance Officer Workspace": "ಅನುಸರಣೆ ಅಧಿಕಾರಿ ಕಾರ್ಯಕ್ಷೇತ್ರ",
      "Real-time cryptographic audit coverage for Canara Bank regional networks.": "ಕೆನರಾ ಬ್ಯಾಂಕ್ ಪ್ರಾದೇಶಿಕ ನೆಟ್ವರ್ಕ್ಗಳಿಗೆ ನೈಜ-ಸಮಯದ ಕ್ರಿಪ್ಟೋಗ್ರಾಫಿಕ್ ಆಡಿಟ್ ಕವರೇಜ್.",
      "Refresh Feed": "ಫೀಡ್ ರಿಫ್ರೆಶ್ ಮಾಡಿ",
      "Compliance Rate": "ಅನುಸರಣೆ ದರ",
      "Active Circulars": "ಸಕ್ರಿಯ ಸುತ್ತೋಲೆಗಳು",
      "Outstanding MAPs": "ಬಾಕಿ ಉಳಿದಿರುವ ಮ್ಯಾಪ್ಗಳು",
      "Quarantined Uploads": "ಕ್ವಾರಂಟೈನ್ ಮಾಡಿದ ಅಪ್ಲೋಡ್ಗಳು",
      "Geographic Compliance Heatmap": "ಭೌಗೋಳಿಕ ಅನುಸರಣೆ ಹೀಟ್ಮ್ಯಾಪ್",
      "BehaviorGuard Risk Alerts": "ಬಿಹೇವಿಯರ್ಗಾರ್ಡ್ ಅಪಾಯದ ಎಚ್ಚರಿಕೆಗಳು",
      "Active MAPs Audit Trail": "ಸಕ್ರಿಯ ಮ್ಯಾಪ್ ಆಡಿಟ್ ಟ್ರಯಲ್"
    }
  },
  ta: {
    translation: {
      "Dashboard": "கட்டுப்பாட்டு அறை",
      "Ingest Circular": "சுற்றறிக்கை சேர்",
      "MAP Management": "மேப் மேலாண்மை",
      "TrustVault Ledger": "டிரஸ்ட்வால்ட் லெட்ஜர்",
      "Risk Review Queue": "அபாய மதிப்பாய்வு",
      "Compliance Tasks": "இணக்கப் பணிகள்",
      "Active User": "செயலில் உள்ள பயனர்",
      "Sign Out": "வெளியேறு",
      "Compliance Command Center": "இணக்க கட்டளை மையம்",
      "Compliance Officer Workspace": "இணக்க அதிகாரி பணியிடம்",
      "Real-time cryptographic audit coverage for Canara Bank regional networks.": "கனரா வங்கி பிராந்திய நெட்வொர்க்குகளுக்கான நிகழ்நேர கிரிப்டோகிராஃபிக் தணிக்கை கவரேஜ்.",
      "Refresh Feed": "ஊட்டத்தை புதுப்பிக்கவும்",
      "Compliance Rate": "இணக்க விகிதம்",
      "Active Circulars": "செயலில் உள்ள சுற்றறிக்கைகள்",
      "Outstanding MAPs": "நிலுவையில் உள்ள மேப்கள்",
      "Quarantined Uploads": "தனிமைப்படுத்தப்பட்ட பதிவேற்றங்கள்",
      "Geographic Compliance Heatmap": "புவியியல் இணக்க ஹீட்மேப்",
      "BehaviorGuard Risk Alerts": "பிஹேவியர்கார்டு ஆபத்து எச்சரிக்கைகள்",
      "Active MAPs Audit Trail": "செயலில் உள்ள மேப் தணிக்கை பாதை"
    }
  },
  ml: {
    translation: {
      "Dashboard": "ഡാഷ്‌ബോർഡ്",
      "Ingest Circular": "സർക്കുലർ ചേർക്കുക",
      "MAP Management": "മാപ്പ് മാനേജ്മെന്റ്",
      "TrustVault Ledger": "ട്രസ്റ്റ്വോൾട്ട് ലെഡ്ജർ",
      "Risk Review Queue": "റിസ്ക് റിവ്യൂ",
      "Compliance Tasks": "കംപ്ലയൻസ് ടാസ്ക്കുകൾ",
      "Active User": "സജീവ ഉപയോക്താവ്",
      "Sign Out": "സൈൻ ഔട്ട്",
      "Compliance Command Center": "കംപ്ലയൻസ് കമാൻഡ് സെന്റർ",
      "Compliance Officer Workspace": "കംപ്ലയൻസ് ഓഫീസർ വർക്ക്സ്പേസ്",
      "Real-time cryptographic audit coverage for Canara Bank regional networks.": "കാനറ ബാങ്ക് റീജിയണൽ നെറ്റ്‌വർക്കുകൾക്കായുള്ള തത്സമയ ക്രിപ്റ്റോഗ്രാഫിക് ഓഡിറ്റ് കവറേജ്.",
      "Refresh Feed": "ഫീഡ് റിഫ്രഷ് ചെയ്യുക",
      "Compliance Rate": "കംപ്ലയൻസ് നിരക്ക്",
      "Active Circulars": "സജീവ സർക്കുലറുകൾ",
      "Outstanding MAPs": "കുടിശ്ശികയുള്ള മാപ്പുകൾ",
      "Quarantined Uploads": "ക്വാറന്റൈൻ ചെയ്ത അപ്‌ലോഡുകൾ",
      "Geographic Compliance Heatmap": "ഭൂമിശാസ്ത്രപരമായ കംപ്ലയൻസ് ഹീറ്റ്മാപ്പ്",
      "BehaviorGuard Risk Alerts": "ബിഹേവിയർഗാർഡ് റിസ്ക് അലർട്ടുകൾ",
      "Active MAPs Audit Trail": "സജീവ മാപ്പ് ഓഡിറ്റ് ട്രയൽ"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
