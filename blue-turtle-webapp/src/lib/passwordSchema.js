import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(12, 'Adgangskoden skal være mindst 12 tegn lang')
  .regex(/[A-Z]/, 'Adgangskoden skal indeholde mindst ét stort bogstav')
  .regex(/[a-z]/, 'Adgangskoden skal indeholde mindst ét lille bogstav')
  .regex(/[0-9]/, 'Adgangskoden skal indeholde mindst ét tal')
  .regex(/[^A-Za-z0-9]/, 'Adgangskoden skal indeholde mindst ét specialtegn');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Nuværende adgangskode er påkrævet'),
  newPassword: passwordSchema,
  confirmNewPassword: z.string().min(1, 'Bekræftelse af adgangskode er påkrævet'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Adgangskoderne er ikke ens',
  path: ['confirmNewPassword'],
});