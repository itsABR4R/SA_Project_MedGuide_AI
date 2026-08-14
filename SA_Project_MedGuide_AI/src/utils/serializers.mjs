export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    age: user.age ?? null,
    bloodType: user.bloodType || '',
    allergies: user.allergies || '',
    // Treat legacy users without this field as already onboarded. Only newly
    // registered accounts are explicitly created with a false value.
    onboardingCompleted: user.onboardingCompleted !== false,
    createdAt: user.createdAt
  };
}
