export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'bn']);

const bangla = Object.freeze({
  Language: 'ভাষা',
  English: 'English',
  Bangla: 'বাংলা',
  'Choose interface language': 'ইন্টারফেসের ভাষা নির্বাচন করুন',
  'Opening MedGuide AI…': 'MedGuide AI খোলা হচ্ছে…',
  'Symptom Checker': 'উপসর্গ পরীক্ষক',
  'AI Health Assistant': 'এআই স্বাস্থ্য সহকারী',
  'Check History': 'পরীক্ষার ইতিহাস',
  'User Profile': 'ব্যবহারকারী প্রোফাইল',
  'Primary navigation': 'প্রধান নেভিগেশন',
  'Private account': 'ব্যক্তিগত অ্যাকাউন্ট',
  'Guest testing account': 'অতিথি পরীক্ষামূলক অ্যাকাউন্ট',
  'Open user profile': 'ব্যবহারকারী প্রোফাইল খুলুন',
  'Open user profile for {name}': '{name}-এর ব্যবহারকারী প্রোফাইল খুলুন',

  'MedGuide AI could not open': 'MedGuide AI খোলা যায়নি',
  'The interface encountered an unexpected error. Reload the page to start a clean session.':
    'ইন্টারফেসে একটি অপ্রত্যাশিত সমস্যা হয়েছে। নতুন সেশন শুরু করতে পৃষ্ঠাটি পুনরায় লোড করুন।',
  'Reload application': 'অ্যাপ্লিকেশন পুনরায় লোড করুন',

  'Account access': 'অ্যাকাউন্টে প্রবেশ',
  'Private MVP': 'ব্যক্তিগত এমভিপি',
  'Sign in to keep your profile and symptom checks attached to your account. This tool gives informational guidance, not a diagnosis.':
    'আপনার প্রোফাইল ও উপসর্গ পরীক্ষাগুলো অ্যাকাউন্টে সংরক্ষণ করতে সাইন ইন করুন। এই টুল তথ্যভিত্তিক নির্দেশনা দেয়, রোগ নির্ণয় নয়।',
  'Account access options': 'অ্যাকাউন্টে প্রবেশের বিকল্প',
  'Sign In': 'সাইন ইন',
  'Create Account': 'অ্যাকাউন্ট তৈরি করুন',
  'Sign Up as a Guest': 'অতিথি হিসেবে সাইন আপ করুন',
  Email: 'ইমেইল',
  Password: 'পাসওয়ার্ড',
  Name: 'নাম',
  Occupation: 'পেশা',
  'Signing In…': 'সাইন ইন হচ্ছে…',
  'Creating Account…': 'অ্যাকাউন্ট তৈরি হচ্ছে…',
  'Creating Guest Account…': 'অতিথি অ্যাকাউন্ট তৈরি হচ্ছে…',
  'Use test details for this MVP. Passwords are hashed; sessions use secure HTTP-only cookies.':
    'এই এমভিপিতে পরীক্ষামূলক তথ্য ব্যবহার করুন। পাসওয়ার্ড হ্যাশ করা হয় এবং সেশনে নিরাপদ HTTP-only কুকি ব্যবহৃত হয়।',
  'Account created.': 'অ্যাকাউন্ট তৈরি হয়েছে।',
  'Guest account created.': 'অতিথি অ্যাকাউন্ট তৈরি হয়েছে।',
  'No email or password is required. Your guest profile, session, symptom checks, and chats are saved for user testing.':
    'ইমেইল বা পাসওয়ার্ডের প্রয়োজন নেই। ব্যবহারকারী পরীক্ষার জন্য আপনার অতিথি প্রোফাইল, সেশন, উপসর্গ পরীক্ষা ও চ্যাট সংরক্ষণ করা হয়।',

  'Welcome to MedGuide AI': 'MedGuide AI-তে স্বাগতম',
  'Your account is ready. This short tour shows where to enter symptoms, compare possible patterns, ask follow-up questions, review history, and update your profile.':
    'আপনার অ্যাকাউন্ট প্রস্তুত। এই সংক্ষিপ্ত ট্যুরে কোথায় উপসর্গ লিখবেন, সম্ভাব্য ধরন তুলনা করবেন, পরবর্তী প্রশ্ন করবেন, ইতিহাস দেখবেন এবং প্রোফাইল হালনাগাদ করবেন তা দেখানো হবে।',
  'Describe what you are feeling': 'আপনি কী অনুভব করছেন তা লিখুন',
  'Add the symptoms, when they started, and what makes them better or worse. More context helps the AI return clearer informational guidance.':
    'উপসর্গ, কখন শুরু হয়েছে এবং কীসে ভালো বা খারাপ হয় তা লিখুন। বেশি প্রেক্ষাপট দিলে এআই আরও পরিষ্কার তথ্যভিত্তিক নির্দেশনা দিতে পারে।',
  'Set the current severity': 'বর্তমান তীব্রতা নির্বাচন করুন',
  'Choose mild, moderate, or severe based on how you feel now. You can also use quick tags beside this panel.':
    'এখন কেমন অনুভব করছেন তার ভিত্তিতে মৃদু, মাঝারি বা তীব্র নির্বাচন করুন। পাশের দ্রুত ট্যাগও ব্যবহার করতে পারেন।',
  'Create your guidance report': 'আপনার নির্দেশনা প্রতিবেদন তৈরি করুন',
  'Select Analyze Symptoms Now. The report opens the closest pattern first and shows 2–3 lower matches underneath for comparison—not as diagnoses.':
    'এখনই উপসর্গ বিশ্লেষণ করুন নির্বাচন করুন। প্রতিবেদনে প্রথমে সবচেয়ে কাছাকাছি ধরন এবং তুলনার জন্য নিচে আরও ২–৩টি কম মিল দেখানো হবে—রোগ নির্ণয় হিসেবে নয়।',
  'Ask a follow-up question': 'পরবর্তী প্রশ্ন করুন',
  'Use the AI Health Assistant for general explanations about your report. It cannot diagnose you or replace a clinician.':
    'আপনার প্রতিবেদন সম্পর্কে সাধারণ ব্যাখ্যার জন্য এআই স্বাস্থ্য সহকারী ব্যবহার করুন। এটি রোগ নির্ণয় করতে বা চিকিৎসকের বিকল্প হতে পারে না।',
  'Return to previous checks': 'আগের পরীক্ষায় ফিরে যান',
  'Every completed symptom check is saved privately to your account. Open an earlier report here or delete it when you no longer need it.':
    'প্রতিটি সম্পন্ন উপসর্গ পরীক্ষা ব্যক্তিগতভাবে আপনার অ্যাকাউন্টে সংরক্ষিত হয়। এখানে আগের প্রতিবেদন খুলুন বা প্রয়োজন না হলে মুছে দিন।',
  'Keep your profile current': 'আপনার প্রোফাইল হালনাগাদ রাখুন',
  'Optional age, blood type, and allergy details can give the assistant useful context. Select Finish to begin with the symptom checker.':
    'ঐচ্ছিক বয়স, রক্তের গ্রুপ ও অ্যালার্জির তথ্য সহকারীকে প্রয়োজনীয় প্রেক্ষাপট দিতে পারে। উপসর্গ পরীক্ষক দিয়ে শুরু করতে শেষ করুন নির্বাচন করুন।',
  'Step {current} of {total}': 'ধাপ {current}/{total}',
  'Skip tour': 'ট্যুর এড়িয়ে যান',
  Back: 'পেছনে',
  Next: 'পরবর্তী',
  Finish: 'শেষ করুন',
  'Finishing…': 'শেষ হচ্ছে…',

  'Reviewed Health Sources': 'পর্যালোচিত স্বাস্থ্য সূত্র',
  'Close sources': 'সূত্র বন্ধ করুন',
  'No source selected': 'কোনো সূত্র নির্বাচন করা হয়নি',
  'The AI did not select a reviewed source for this part of the guidance.':
    'নির্দেশনার এই অংশের জন্য এআই কোনো পর্যালোচিত সূত্র নির্বাচন করেনি।',
  REVIEWED: 'পর্যালোচিত',
  'MedlinePlus — Headache danger signs': 'MedlinePlus — মাথাব্যথার বিপদের লক্ষণ',
  'MedlinePlus — Fever': 'MedlinePlus — জ্বর',
  'MedlinePlus — Symptoms': 'MedlinePlus — উপসর্গ',
  'NHS — Headaches': 'NHS — মাথাব্যথা',
  'NHS — Tension headaches': 'NHS — টেনশনজনিত মাথাব্যথা',
  'NHS — Flu': 'NHS — ফ্লু',
  'U.S. National Library of Medicine': 'যুক্তরাষ্ট্রের ন্যাশনাল লাইব্রেরি অব মেডিসিন',
  'National Health Service': 'ন্যাশনাল হেলথ সার্ভিস',
  'Warning signs and situations in which a headache needs prompt medical attention.':
    'মাথাব্যথায় দ্রুত চিকিৎসা প্রয়োজন এমন সতর্কসংকেত ও পরিস্থিতি।',
  'General fever information and warning signs that need urgent care.':
    'জ্বরের সাধারণ তথ্য এবং জরুরি যত্ন প্রয়োজন এমন সতর্কসংকেত।',
  'A directory of reviewed health information organized by symptom.':
    'উপসর্গ অনুযায়ী সাজানো পর্যালোচিত স্বাস্থ্যতথ্যের তালিকা।',
  'Common headache patterns, self-care, and guidance on getting medical help.':
    'সাধারণ মাথাব্যথার ধরন, নিজের যত্ন এবং চিকিৎসা সহায়তা নেওয়ার নির্দেশনা।',
  'Symptoms, common triggers, self-care, and when to see a clinician.':
    'উপসর্গ, সাধারণ কারণ, নিজের যত্ন এবং কখন চিকিৎসকের কাছে যেতে হবে।',
  'Typical influenza symptoms and guidance on when to seek help.':
    'ইনফ্লুয়েঞ্জার সাধারণ উপসর্গ এবং কখন সহায়তা নিতে হবে তার নির্দেশনা।',

  'This tool is for informational AI guidance only. It does not replace professional medical advice.':
    'এই টুলটি শুধু তথ্যভিত্তিক এআই নির্দেশনার জন্য। এটি পেশাদার চিকিৎসা পরামর্শের বিকল্প নয়।',
  'informational AI guidance only': 'শুধু তথ্যভিত্তিক এআই নির্দেশনা',
  'One setup step remains:': 'আরও একটি সেটআপ ধাপ বাকি:',
  'add your private OpenRouter API key to the server environment to enable real analysis and chat.':
    'বাস্তব বিশ্লেষণ ও চ্যাট চালু করতে সার্ভার এনভায়রনমেন্টে আপনার ব্যক্তিগত OpenRouter API কী যোগ করুন।',
  'How are you feeling today?': 'আজ আপনি কেমন অনুভব করছেন?',
  'Describe your symptoms in detail for AI health analysis':
    'এআই স্বাস্থ্য বিশ্লেষণের জন্য আপনার উপসর্গ বিস্তারিত লিখুন',
  'Describe Your Symptoms': 'আপনার উপসর্গ লিখুন',
  'e.g. I have a persistent headache, feel fatigued, and noticed a slight fever since yesterday morning...':
    'যেমন: গতকাল সকাল থেকে মাথাব্যথা, ক্লান্তি এবং সামান্য জ্বর অনুভব করছি…',
  'Analyze Symptoms Now': 'এখনই উপসর্গ বিশ্লেষণ করুন',
  'Symptom Severity': 'উপসর্গের তীব্রতা',
  Mild: 'মৃদু',
  Moderate: 'মাঝারি',
  Severe: 'তীব্র',
  'Quick Add Tags': 'দ্রুত ট্যাগ যোগ করুন',
  Stress: 'চাপ',
  Headache: 'মাথাব্যথা',
  Fever: 'জ্বর',
  'Analysis Tip': 'বিশ্লেষণের পরামর্শ',
  "Include details like how long you've felt sick, what makes it better or worse, and any severity factors.":
    'কতক্ষণ ধরে অসুস্থ, কীসে ভালো বা খারাপ হয় এবং তীব্রতার কারণগুলো লিখুন।',
  'Analyzing your symptoms with AI models…': 'এআই মডেল দিয়ে আপনার উপসর্গ বিশ্লেষণ করা হচ্ছে…',
  'Back to symptom input': 'উপসর্গ লেখার পাতায় ফিরে যান',
  'Check another symptom': 'অন্য উপসর্গ পরীক্ষা করুন',
  'Back to results': 'ফলাফলে ফিরে যান',
  'Possible Conditions': 'সম্ভাব্য স্বাস্থ্যগত ধরন',
  'Based on your reported symptoms': 'আপনার জানানো উপসর্গের ভিত্তিতে',
  'Your symptom query': 'আপনার উপসর্গের বিবরণ',
  'No written symptom query was saved.': 'লিখিত কোনো উপসর্গের বিবরণ সংরক্ষিত নেই।',
  'AI Guidance Summary': 'এআই নির্দেশনার সারাংশ',
  'View Action Plan & Next Steps': 'করণীয় পরিকল্পনা ও পরবর্তী ধাপ দেখুন',
  'Back to possible conditions': 'সম্ভাব্য ধরনে ফিরে যান',
  'Action Plan': 'করণীয় পরিকল্পনা',
  'Recommended next steps & guidelines': 'প্রস্তাবিত পরবর্তী ধাপ ও নির্দেশনা',
  'Home Care Tips': 'বাড়িতে যত্নের পরামর্শ',
  'When to see a doctor': 'কখন চিকিৎসকের কাছে যাবেন',
  'Discuss Details with AI Assistant': 'এআই সহকারীর সঙ্গে বিস্তারিত আলোচনা করুন',
  'Describe your symptoms or select a quick tag.': 'আপনার উপসর্গ লিখুন অথবা একটি দ্রুত ট্যাগ নির্বাচন করুন।',
  'The report was created, but history could not be refreshed: {message}':
    'প্রতিবেদন তৈরি হয়েছে, তবে ইতিহাস হালনাগাদ করা যায়নি: {message}',
  'Delete this saved symptom check? This cannot be undone.':
    'সংরক্ষিত উপসর্গ পরীক্ষাটি মুছে ফেলবেন? এটি আর ফিরিয়ে আনা যাবে না।',
  'Saved check deleted.': 'সংরক্ষিত পরীক্ষা মুছে ফেলা হয়েছে।',
  'No symptom-check summary was saved.': 'উপসর্গ পরীক্ষার কোনো সারাংশ সংরক্ষিত নেই।',
  'Symptom-check summary': 'উপসর্গ পরীক্ষার সারাংশ',
  'Your query: {query}': 'আপনার বিবরণ: {query}',
  'Guidance summary: {summary}': 'নির্দেশনার সারাংশ: {summary}',
  'Selected pattern: {name}. {explanation}': 'নির্বাচিত ধরন: {name}। {explanation}',

  'Strong pattern': 'শক্তিশালী মিল',
  'Possible pattern': 'সম্ভাব্য মিল',
  'Limited pattern': 'সীমিত মিল',
  Routine: 'সাধারণ',
  Soon: 'শিগগির',
  Urgent: 'জরুরি',
  'Follow-up: {urgency}': 'পরবর্তী পদক্ষেপ: {urgency}',
  '{percentage}% match': '{percentage}% মিল',
  'Relative overlap with the symptoms you reported—not a diagnostic probability':
    'আপনার জানানো উপসর্গের সঙ্গে তুলনামূলক মিল—রোগ নির্ণয়ের সম্ভাবনা নয়',
  '{percentage} percent symptom-pattern match; not a diagnostic probability':
    'উপসর্গের ধরনের সঙ্গে {percentage} শতাংশ মিল; এটি রোগ নির্ণয়ের সম্ভাবনা নয়',
  'Matched symptoms': 'মিল পাওয়া উপসর্গ',
  'Reported details': 'জানানো তথ্য',
  'How the AI interpreted this pattern': 'এআই এই ধরনটি যেভাবে ব্যাখ্যা করেছে',
  Sources: 'সূত্র',
  'Discuss with AI': 'এআই-এর সঙ্গে আলোচনা করুন',
  Detailed: 'বিস্তারিত',
  'Open detailed explanation for {name}': '{name}-এর বিস্তারিত ব্যাখ্যা খুলুন',
  'No condition pattern shown': 'কোনো স্বাস্থ্যগত ধরন দেখানো হয়নি',
  'The details may be insufficient, or the report may need direct medical assessment. Review the next-step guidance below.':
    'তথ্য অপর্যাপ্ত হতে পারে অথবা সরাসরি চিকিৎসা মূল্যায়ন প্রয়োজন হতে পারে। নিচের পরবর্তী নির্দেশনা দেখুন।',
  'Match percentages compare overlap with your reported symptoms. They are not the probability of a diagnosis.':
    'মিলের শতাংশ আপনার জানানো উপসর্গের সঙ্গে তুলনা দেখায়। এটি রোগ নির্ণয়ের সম্ভাবনা নয়।',
  'Other possible matches': 'অন্যান্য সম্ভাব্য মিল',
  'Lower matches are included for comparison and are not diagnoses.':
    'তুলনার জন্য কম মিলগুলো দেখানো হয়েছে; এগুলো রোগ নির্ণয় নয়।',
  '{count} lower match': '{count}টি কম মিল',
  '{count} lower matches': '{count}টি কম মিল',
  'No additional guidance was returned. Contact a clinician if you are concerned.':
    'অতিরিক্ত নির্দেশনা পাওয়া যায়নি। উদ্বিগ্ন হলে চিকিৎসকের সঙ্গে যোগাযোগ করুন।',

  'Detailed Pattern Explanation': 'স্বাস্থ্যগত ধরনের বিস্তারিত ব্যাখ্যা',
  'Close detailed explanation': 'বিস্তারিত ব্যাখ্যা বন্ধ করুন',
  'Informational symptom-pattern comparison': 'তথ্যভিত্তিক উপসর্গ-ধরন তুলনা',
  'How your symptoms were interpreted': 'আপনার উপসর্গ যেভাবে ব্যাখ্যা করা হয়েছে',
  'How this result was formed': 'এই ফলাফল যেভাবে তৈরি হয়েছে',
  'What the result does and does not mean': 'এই ফলাফলের অর্থ কী এবং কী নয়',
  'The available report does not contain an additional detailed explanation for this pattern.':
    'এই ধরনের জন্য প্রতিবেদনে অতিরিক্ত বিস্তারিত ব্যাখ্যা নেই।',
  'the details in your symptom report': 'আপনার উপসর্গ প্রতিবেদনের তথ্য',
  'The analysis compared {symptoms} with the features associated with this possible pattern. The returned overlap score was {percentage}%, which places it in the {level} range of {range}. The score is kept within that range by the application so patterns can be compared consistently.':
    'বিশ্লেষণে {symptoms}-এর সঙ্গে এই সম্ভাব্য ধরনের বৈশিষ্ট্য তুলনা করা হয়েছে। প্রাপ্ত মিলের স্কোর {percentage}%, যা {range} সীমার {level}-এ পড়ে। বিভিন্ন ধরন ধারাবাহিকভাবে তুলনা করতে অ্যাপ্লিকেশন স্কোরটিকে এই সীমার মধ্যে রাখে।',
  'This percentage describes relative overlap with the symptoms you reported. It is not the probability of a diagnosis and cannot account for a physical examination, laboratory tests, the complete timeline, or your full medical history. A qualified healthcare professional must evaluate those details before identifying a cause.':
    'এই শতাংশ আপনার জানানো উপসর্গের সঙ্গে তুলনামূলক মিল বোঝায়। এটি রোগ নির্ণয়ের সম্ভাবনা নয় এবং শারীরিক পরীক্ষা, ল্যাব পরীক্ষা, সম্পূর্ণ সময়রেখা বা পূর্ণ চিকিৎসা ইতিহাস বিবেচনা করতে পারে না। কারণ নির্ধারণের আগে একজন যোগ্য স্বাস্থ্যসেবা পেশাজীবীকে এসব তথ্য মূল্যায়ন করতে হবে।',
  'strong pattern': 'শক্তিশালী মিল',
  'possible pattern': 'সম্ভাব্য মিল',
  'limited pattern': 'সীমিত মিল',
  '70–89%': '৭০–৮৯%',
  '45–69%': '৪৫–৬৯%',
  '20–44%': '২০–৪৪%',

  'Your Check History': 'আপনার পরীক্ষার ইতিহাস',
  'Open or remove symptom checks saved securely to your account on this server.':
    'এই সার্ভারে আপনার অ্যাকাউন্টে নিরাপদে সংরক্ষিত উপসর্গ পরীক্ষা খুলুন বা মুছে দিন।',
  'No saved checks yet': 'এখনও কোনো সংরক্ষিত পরীক্ষা নেই',
  'Complete a symptom check and it will be saved to your account here.':
    'একটি উপসর্গ পরীক্ষা সম্পন্ন করলে সেটি এখানে আপনার অ্যাকাউন্টে সংরক্ষিত হবে।',
  'Symptom check': 'উপসর্গ পরীক্ষা',
  'Open report': 'প্রতিবেদন খুলুন',
  'Open chats': 'চ্যাট খুলুন',
  'Other saved conversations': 'অন্যান্য সংরক্ষিত কথোপকথন',
  'General chats and older conversations without a linked symptom report.':
    'সাধারণ চ্যাট এবং কোনো উপসর্গ প্রতিবেদনের সঙ্গে যুক্ত নয় এমন পুরোনো কথোপকথন।',
  'Open other saved chats': 'অন্যান্য সংরক্ষিত চ্যাট খুলুন',
  'Delete this symptom check and all its related chats and branches? This cannot be undone.':
    'এই উপসর্গ পরীক্ষা এবং এর সঙ্গে সম্পর্কিত সব চ্যাট ও শাখা মুছে ফেলবেন? এটি আর ফিরিয়ে আনা যাবে না।',
  'Symptom check and related chats deleted.':
    'উপসর্গ পরীক্ষা এবং এর সঙ্গে সম্পর্কিত চ্যাটগুলো মুছে ফেলা হয়েছে।',
  Delete: 'মুছুন',

  'Checks Done': 'সম্পন্ন পরীক্ষা',
  Session: 'সেশন',
  '{count}d': '{count} দিন',
  'Sign Out': 'সাইন আউট',
  'Personal Information': 'ব্যক্তিগত তথ্য',
  'Display name': 'প্রদর্শিত নাম',
  Age: 'বয়স',
  Optional: 'ঐচ্ছিক',
  'Blood type': 'রক্তের গ্রুপ',
  'Not provided': 'দেওয়া হয়নি',
  'Known allergies': 'পরিচিত অ্যালার্জি',
  'e.g. penicillin, peanuts — or leave blank': 'যেমন: পেনিসিলিন, চিনাবাদাম—অথবা খালি রাখুন',
  'Saving…': 'সংরক্ষণ হচ্ছে…',
  Saved: 'সংরক্ষিত',
  'Save Profile': 'প্রোফাইল সংরক্ষণ করুন',
  'Privacy note': 'গোপনীয়তা নোট',
  "Profile details and check history stay in this app's configured MongoDB database. Do not use real patient data until you have reviewed the hosting, privacy, and compliance requirements for your region.":
    'প্রোফাইলের তথ্য ও পরীক্ষার ইতিহাস এই অ্যাপের কনফিগার করা MongoDB ডেটাবেজে থাকে। আপনার অঞ্চলের হোস্টিং, গোপনীয়তা ও কমপ্লায়েন্সের প্রয়োজনীয়তা পর্যালোচনা না করা পর্যন্ত বাস্তব রোগীর তথ্য ব্যবহার করবেন না।',
  "This guest profile and all linked symptom checks, chats, and branches are stored in this app's configured MongoDB database for user testing.":
    'ব্যবহারকারী পরীক্ষার জন্য এই অতিথি প্রোফাইল এবং এর সঙ্গে যুক্ত সব উপসর্গ পরীক্ষা, চ্যাট ও শাখা অ্যাপটির কনফিগার করা MongoDB ডেটাবেজে সংরক্ষণ করা হয়।',

  "Hello! I'm your AI health assistant. How can I help you today? You can ask me about symptoms, medications, general wellness, or anything health-related.":
    'স্বাগতম! আমি আপনার এআই স্বাস্থ্য সহকারী। আজ কীভাবে সাহায্য করতে পারি? উপসর্গ, ওষুধ, সাধারণ সুস্থতা বা স্বাস্থ্য-সম্পর্কিত যেকোনো প্রশ্ন করতে পারেন।',
  'Conversation context': 'কথোপকথনের প্রেক্ষাপট',
  'Clipboard access is unavailable.': 'ক্লিপবোর্ড ব্যবহারের অনুমতি নেই।',
  Ready: 'প্রস্তুত',
  'Setup needed': 'সেটআপ প্রয়োজন',
  Thinking: 'ভাবছে',
  'Try again': 'আবার চেষ্টা করুন',
  'New chat': 'নতুন চ্যাট',
  Conversations: 'কথোপকথন',
  'Main chats and branches': 'মূল চ্যাট ও শাখা',
  'Chats for this symptom check': 'এই উপসর্গ পরীক্ষার চ্যাট',
  'Current conversation': 'বর্তমান কথোপকথন',
  'Chat history': 'চ্যাটের ইতিহাস',
  'Chats for this check will appear here.': 'এই পরীক্ষার চ্যাটগুলো এখানে দেখা যাবে।',
  'Start a new chat. Open earlier discussions from Check History.':
    'একটি নতুন চ্যাট শুরু করুন। আগের আলোচনা চেক হিস্ট্রি থেকে খুলুন।',
  'Your saved conversations will appear here.': 'আপনার সংরক্ষিত কথোপকথন এখানে দেখা যাবে।',
  'Ask about health, symptoms, medications, or general wellness':
    'স্বাস্থ্য, উপসর্গ, ওষুধ বা সাধারণ সুস্থতা সম্পর্কে জিজ্ঞাসা করুন',
  'Context summary · not an AI response': 'প্রেক্ষাপটের সারাংশ · এটি এআই উত্তর নয়',
  Copy: 'কপি',
  Copied: 'কপি হয়েছে',
  'Copy to clipboard': 'ক্লিপবোর্ডে কপি করুন',
  'Copy message to clipboard': 'বার্তা ক্লিপবোর্ডে কপি করুন',
  'Copy response to clipboard': 'উত্তর ক্লিপবোর্ডে কপি করুন',
  'Read aloud': 'উচ্চস্বরে পড়ুন',
  Stop: 'থামান',
  'Stop reading': 'পড়া থামান',
  'Read response aloud': 'উত্তর উচ্চস্বরে পড়ুন',
  'Stop reading response': 'উত্তর পড়া থামান',
  'This main conversation already has two branches': 'এই মূল কথোপকথনে ইতিমধ্যে দুটি শাখা আছে',
  'Continue from this response in a new branch': 'এই উত্তর থেকে নতুন শাখায় চালিয়ে যান',
  'Branch limit reached for this conversation': 'এই কথোপকথনের শাখা সীমা পূর্ণ হয়েছে',
  'Branch to new chat from this response': 'এই উত্তর থেকে নতুন চ্যাট শাখা তৈরি করুন',
  'Branching…': 'শাখা তৈরি হচ্ছে…',
  '2 branches used': '২টি শাখা ব্যবহৃত',
  'Branch to new chat': 'নতুন চ্যাটে শাখা করুন',
  'Assistant is thinking': 'সহকারী ভাবছে',
  "Type your message here… (e.g., 'What can I do for a mild headache?')":
    'এখানে আপনার বার্তা লিখুন… (যেমন: মৃদু মাথাব্যথায় কী করতে পারি?)',
  'Send message': 'বার্তা পাঠান',
  'Opening…': 'খোলা হচ্ছে…',
  'Main conversation': 'মূল কথোপকথন',
  Branch: 'শাখা',
  'Delete {title}': '{title} মুছুন',
  'Delete branch': 'শাখা মুছুন',
  'Delete conversation folder': 'কথোপকথনের ফোল্ডার মুছুন',
  'Collapse branches for {title}': '{title}-এর শাখাগুলো গুটিয়ে নিন',
  'Expand branches for {title}': '{title}-এর শাখাগুলো খুলুন',
  'Branches of {title}': '{title}-এর শাখা',
  'Delete “{title}” and all of its branches? This cannot be undone.':
    '“{title}” এবং এর সব শাখা মুছে ফেলবেন? এটি আর ফিরিয়ে আনা যাবে না।',
  'Delete “{title}”? This cannot be undone.': '“{title}” মুছে ফেলবেন? এটি আর ফিরিয়ে আনা যাবে না।',
  'Conversation folder deleted.': 'কথোপকথনের ফোল্ডার মুছে ফেলা হয়েছে।',
  'Chat branch deleted.': 'চ্যাট শাখা মুছে ফেলা হয়েছে।',
  'The message could not be copied.': 'বার্তাটি কপি করা যায়নি।',
  'Read aloud is not supported by this browser.': 'এই ব্রাউজারে উচ্চস্বরে পড়া সমর্থিত নয়।',
  'No Bangla voice is available in this browser. Enable a Bangla text-to-speech voice on your device, then try again.':
    'এই ব্রাউজারে বাংলা পড়ার কণ্ঠস্বর পাওয়া যায়নি। আপনার ডিভাইসে বাংলা টেক্সট-টু-স্পিচ কণ্ঠস্বর চালু করে আবার চেষ্টা করুন।',
  'No English voice is available in this browser. Enable an English text-to-speech voice on your device, then try again.':
    'এই ব্রাউজারে ইংরেজি পড়ার কণ্ঠস্বর পাওয়া যায়নি। আপনার ডিভাইসে ইংরেজি টেক্সট-টু-স্পিচ কণ্ঠস্বর চালু করে আবার চেষ্টা করুন।',
  'The response could not be read aloud. Please try again.':
    'উত্তরটি উচ্চস্বরে পড়া যায়নি। আবার চেষ্টা করুন।',
  'Branch {number} created with the previous context.': 'আগের প্রেক্ষাপটসহ শাখা {number} তৈরি হয়েছে।',
  "I couldn't send that request: {message}": 'অনুরোধটি পাঠানো যায়নি: {message}',

  symptoms: 'উপসর্গ',
  message: 'বার্তা',
  'Stop voice typing': 'ভয়েস টাইপ বন্ধ করুন',
  'Type {context} by voice': 'ভয়েস দিয়ে {context} লিখুন',
  'Voice typing is not supported by this browser': 'এই ব্রাউজারে ভয়েস টাইপিং সমর্থিত নয়',
  'Listening…': 'শোনা হচ্ছে…',
  'Voice type': 'ভয়েস টাইপ',
  'No working microphone was found. Check your microphone and try again.':
    'কোনো কার্যকর মাইক্রোফোন পাওয়া যায়নি। মাইক্রোফোন পরীক্ষা করে আবার চেষ্টা করুন।',
  'Voice recognition could not connect. Check your network and try again.':
    'ভয়েস শনাক্তকরণ সংযোগ করতে পারেনি। নেটওয়ার্ক পরীক্ষা করে আবার চেষ্টা করুন।',
  'No speech was detected. Try again and speak clearly.':
    'কোনো কথা শনাক্ত হয়নি। আবার চেষ্টা করুন এবং স্পষ্টভাবে বলুন।',
  'Microphone access was denied. Allow it in your browser settings and try again.':
    'মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংসে অনুমতি দিয়ে আবার চেষ্টা করুন।',
  'Voice recognition is blocked by this browser. Check its microphone and speech permissions.':
    'এই ব্রাউজারে ভয়েস শনাক্তকরণ বন্ধ আছে। মাইক্রোফোন ও স্পিচ অনুমতি পরীক্ষা করুন।',
  'Voice recognition does not support your browser language.':
    'ভয়েস শনাক্তকরণ আপনার ব্রাউজারের ভাষা সমর্থন করে না।',
  'Voice recognition stopped unexpectedly. Please try again.':
    'ভয়েস শনাক্তকরণ অপ্রত্যাশিতভাবে বন্ধ হয়েছে। আবার চেষ্টা করুন।',
  'Voice typing is not supported by this browser. Try a current Chromium-based browser.':
    'এই ব্রাউজারে ভয়েস টাইপিং সমর্থিত নয়। হালনাগাদ Chromium-ভিত্তিক ব্রাউজার ব্যবহার করুন।',
  'Voice recognition could not start. Wait a moment and try again.':
    'ভয়েস শনাক্তকরণ শুরু করা যায়নি। একটু অপেক্ষা করে আবার চেষ্টা করুন।',

  'The tour closed, but its completion could not be saved: {message}':
    'ট্যুর বন্ধ হয়েছে, তবে সমাপ্তির তথ্য সংরক্ষণ করা যায়নি: {message}',
  'The request failed.': 'অনুরোধ ব্যর্থ হয়েছে।',
  'The request took too long. Please try again.': 'অনুরোধে অনেক সময় লেগেছে। আবার চেষ্টা করুন।',
  'Cannot reach the app server. Make sure it is running and try again.':
    'অ্যাপ সার্ভারে সংযোগ করা যাচ্ছে না। সার্ভার চালু আছে কি না দেখে আবার চেষ্টা করুন।'
});

export function normalizeLanguage(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .startsWith('bn')
    ? 'bn'
    : 'en';
}

export function translate(language, key, parameters = {}) {
  const template = normalizeLanguage(language) === 'bn' ? bangla[key] || key : key;
  return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) =>
    parameters[name] === undefined || parameters[name] === null ? match : String(parameters[name])
  );
}

export function hasTranslation(language, key) {
  return normalizeLanguage(language) === 'en' || Boolean(bangla[key]);
}
