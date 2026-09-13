export function publicUser(user) {
  const accountType = user.accountType === 'guest' ? 'guest' : 'registered';
  return {
    id: user.id,
    accountType,
    email: user.email || '',
    name: user.name,
    age: user.age ?? null,
    occupation: accountType === 'guest' ? user.occupation || '' : '',
    bloodType: user.bloodType || '',
    allergies: user.allergies || '',
    // Treat legacy users without this field as already onboarded. Only newly
    // registered accounts are explicitly created with a false value.
    onboardingCompleted: user.onboardingCompleted !== false,
    createdAt: user.createdAt
  };
}
