const banglaErrors = Object.freeze({
  AI_CONFIGURATION_ERROR: 'OpenRouter API কী গ্রহণ করেনি। .env ফাইলে OPENROUTER_API_KEY পরীক্ষা করুন।',
  AI_CREDITS_REQUIRED: 'কনফিগার করা মডেলের জন্য OpenRouter-এ পর্যাপ্ত ক্রেডিট নেই।',
  AI_EMPTY_RESPONSE: 'OpenRouter কোনো উত্তর দেয়নি। আবার চেষ্টা করুন।',
  AI_INCOMPLETE_RESPONSE:
    'এআই যথেষ্ট আলাদা স্বাস্থ্যগত ধরন দেয়নি। উপসর্গের আরও কিছু তথ্য যোগ করে আবার চেষ্টা করুন।',
  AI_INVALID_RESPONSE: 'এআই-এর উত্তর নিরাপদভাবে প্রক্রিয়া করা যায়নি। আবার চেষ্টা করুন।',
  AI_NOT_CONFIGURED: 'এআই সুবিধা ব্যবহারের আগে সার্ভার এনভায়রনমেন্টে OPENROUTER_API_KEY যোগ করুন।',
  AI_RATE_LIMIT: 'OpenRouter সাময়িকভাবে অনেক অনুরোধ পাচ্ছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।',
  AI_REQUEST_REJECTED:
    'OpenRouter মডেল অনুরোধটি প্রত্যাখ্যান করেছে। .env ফাইলে OPENROUTER_MODEL পরীক্ষা করুন।',
  AI_ROUTE_UNAVAILABLE: 'মডেল ও গোপনীয়তা সেটিংসের জন্য বর্তমানে উপযুক্ত OpenRouter রুট পাওয়া যাচ্ছে না।',
  AI_SERVICE_ERROR: 'OpenRouter অনুরোধটি সম্পন্ন করতে পারেনি। আবার চেষ্টা করুন।',
  AI_TIMEOUT: 'OpenRouter উত্তর দিতে বেশি সময় নিয়েছে। আবার চেষ্টা করুন।',
  AI_TRUNCATED_RESPONSE: 'এআই-এর উত্তর অসম্পূর্ণ হয়েছে। অনুরোধটি সংক্ষিপ্ত করে আবার চেষ্টা করুন।',
  API_NOT_FOUND: 'API রুটটি পাওয়া যায়নি।',
  AUTH_REQUIRED: 'চালিয়ে যেতে সাইন ইন করুন।',
  BRANCH_LIMIT_REACHED: 'এই মূল কথোপকথনে সর্বোচ্চ দুটি শাখা ইতিমধ্যে তৈরি হয়েছে।',
  BRANCH_SOURCE_INVALID: 'শাখা শুরু করতে একটি এআই উত্তর নির্বাচন করুন।',
  BRANCH_SOURCE_REQUIRED: 'শাখা শুরু করতে একটি এআই উত্তর নির্বাচন করুন।',
  CHECK_NOT_FOUND: 'সংরক্ষিত পরীক্ষাটি পাওয়া যায়নি।',
  CONVERSATION_NOT_FOUND: 'চ্যাট কথোপকথনটি পাওয়া যায়নি।',
  CONVERSATION_REQUIRED: 'একটি চ্যাট কথোপকথন নির্বাচন করুন।',
  CONVERSATION_SCOPE_MISMATCH:
    'এই কথোপকথনটি অন্য একটি উপসর্গ পরীক্ষার। চেক হিস্ট্রি থেকে সেই রিপোর্টের চ্যাট খুলুন।',
  DATABASE_VALIDATION_ERROR: 'দেওয়া তথ্য সংরক্ষণ করা যায়নি।',
  DUPLICATE_VALUE: 'এই তথ্যটি ইতিমধ্যে ব্যবহৃত হচ্ছে।',
  EMAIL_EXISTS: 'এই ইমেইলে ইতিমধ্যে একটি অ্যাকাউন্ট আছে।',
  INVALID_AGE: '১৩ থেকে ১২০ বছরের মধ্যে বয়স লিখুন অথবা খালি রাখুন।',
  INVALID_BLOOD_TYPE: 'O+ বা AB−-এর মতো একটি রক্তের গ্রুপ লিখুন।',
  INVALID_EMAIL: 'একটি সঠিক ইমেইল ঠিকানা লিখুন।',
  INVALID_JSON: 'অনুরোধে ভুল JSON রয়েছে।',
  INVALID_CHAT_SCOPE: 'একটি সঠিক উপসর্গ পরীক্ষা নির্বাচন করুন।',
  INVALID_LOGIN: 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।',
  INVALID_NAME: 'আপনার নাম লিখুন।',
  INVALID_OCCUPATION: 'আপনার পেশা লিখুন।',
  INVALID_PASSWORD: 'কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।',
  JSON_REQUIRED: 'অনুরোধটি JSON হিসেবে পাঠান।',
  MESSAGE_REQUIRED: 'একটি বার্তা লিখুন।',
  NOT_FOUND: 'পৃষ্ঠাটি পাওয়া যায়নি।',
  ORIGIN_REJECTED: 'অনুরোধের উৎস প্রত্যাখ্যান করা হয়েছে।',
  RATE_LIMITED: 'অনেক বেশি অনুরোধ করা হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।',
  REQUEST_TOO_LARGE: 'অনুরোধটি খুব বড়।',
  SERVER_ERROR: 'সার্ভারে একটি সমস্যা হয়েছে।',
  SYMPTOMS_REQUIRED: 'আপনার উপসর্গ লিখুন অথবা অন্তত একটি ট্যাগ নির্বাচন করুন।',
  TTS_INVALID_RESPONSE: 'স্পিচ সেবা সঠিক অডিও দেয়নি। আবার চেষ্টা করুন।',
  TTS_ROUTE_UNAVAILABLE:
    'নির্বাচিত স্পিচ মডেল বা কণ্ঠস্বর পাওয়া যাচ্ছে না। সার্ভারের স্পিচ সেটিংস পরীক্ষা করুন।',
  TTS_SERVICE_ERROR: 'স্পিচ তৈরি করা যায়নি। আবার চেষ্টা করুন।',
  TTS_TEXT_REQUIRED: 'উচ্চস্বরে পড়ার জন্য একটি উত্তর নির্বাচন করুন।',
  TTS_TEXT_TOO_LONG: 'উচ্চস্বরে পড়ার লেখা সর্বোচ্চ ৪০০০ অক্ষরের হতে পারে।',
  TTS_TIMEOUT: 'স্পিচ তৈরি হতে বেশি সময় লেগেছে। আবার চেষ্টা করুন।',
  USER_NOT_FOUND: 'সাইন ইন করা ব্যবহারকারীকে পাওয়া যায়নি।'
});

export function normalizeLanguage(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .startsWith('bn')
    ? 'bn'
    : 'en';
}

export function requestLanguage(req) {
  return normalizeLanguage(req?.language || req?.get?.('accept-language'));
}

export function languageInstruction(language) {
  if (normalizeLanguage(language) !== 'bn') {
    return 'Write all user-facing prose in clear English.';
  }
  return 'Write every user-facing name, summary, explanation, matched symptom, self-care item, warning, and reply in natural Bangla (বাংলা). Keep JSON property names, enum values, and source IDs exactly as specified in English.';
}

export function localizedErrorMessage(code, language, fallback) {
  if (normalizeLanguage(language) !== 'bn') return fallback;
  return banglaErrors[code] || 'অনুরোধটি সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।';
}
