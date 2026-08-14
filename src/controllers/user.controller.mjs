import { AppError } from '../utils/app-error.mjs';
import { publicUser } from '../utils/serializers.mjs';
import { cleanText } from '../utils/text.mjs';

export function createUserController({ repository, aiService }) {
  return {
    async me(req, res) {
      const checkCount = await repository.countChecks(req.user.id);
      res.json({ user: publicUser(req.user), checkCount, aiConfigured: aiService.isConfigured() });
    },

    async updateProfile(req, res) {
      const body = req.body || {};
      const name = cleanText(body.name, 80);
      const age = body.age === '' || body.age === null || body.age === undefined ? null : Number(body.age);
      const bloodType = cleanText(body.bloodType, 8).toUpperCase();
      const allergies = cleanText(body.allergies, 500);

      if (name.length < 2) throw new AppError(400, 'INVALID_NAME', 'Enter your name.');
      if (age !== null && (!Number.isInteger(age) || age < 13 || age > 120)) {
        throw new AppError(400, 'INVALID_AGE', 'Enter an age from 13 to 120, or leave it blank.');
      }
      if (bloodType && !/^(A|B|AB|O)[+-]$/i.test(bloodType)) {
        throw new AppError(400, 'INVALID_BLOOD_TYPE', 'Use a blood type such as O+ or AB-.');
      }

      const user = await repository.updateUser(req.user.id, { name, age, bloodType, allergies });
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'The signed-in user was not found.');
      res.json({ user: publicUser(user) });
    },

    async completeOnboarding(req, res) {
      const user = await repository.updateUser(req.user.id, { onboardingCompleted: true });
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'The signed-in user was not found.');
      res.json({ user: publicUser(user) });
    }
  };
}
