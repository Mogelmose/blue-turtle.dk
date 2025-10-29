'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema } from '@/lib/passwordSchema';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [strength, setStrength] = useState('Svag');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPassword = watch('newPassword', '');

  const requirements = useMemo(
    () => [
      { label: 'Minimum 12 karakterer', met: newPassword.length >= 12 },
      { label: 'Mindst 1 stort bogstav (A-Z)', met: /[A-Z]/.test(newPassword) },
      { label: 'Mindst 1 lille bogstav (a-z)', met: /[a-z]/.test(newPassword) },
      { label: 'Mindst 1 tal (0-9)', met: /[0-9]/.test(newPassword) },
      { label: 'Mindst 1 specialtegn', met: /[^A-Za-z0-9]/.test(newPassword) },
    ],
    [newPassword]
  );

  useEffect(() => {
    const metCount = requirements.filter((r) => r.met).length;
    const newStrength =
      metCount < 3 ? 'Svag' : metCount < 5 ? 'Medium' : 'Stærk';
    setStrength(newStrength);
  }, [requirements]);

  const onSubmit = async (data) => {
    setServerError('');
    setSuccess('');

    try {
      const response = await fetch('/api/password-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Adgangskoden er opdateret!');
        setTimeout(() => {
          reset();
          setSuccess('');
          setServerError('');
          onClose();
        }, 2000);
      } else {
        setServerError(result.error || 'Noget gik galt');
      }
    } catch (error) {
      setServerError('Netværksfejl. Prøv igen.');
      console.error('Password change error:', error);
    }
  };

  const handleClose = () => {
    reset();
    setServerError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-lg border border-dark-border bg-dark-elevated p-6 shadow-lg">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          &times;
        </button>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={isSubmitting} className="space-y-4">
            <h2 className="text-center text-xl font-bold text-white">Skift din Adgangskode</h2>
            {serverError && <p className="text-center text-error">{serverError}</p>}
            {success && <p className="text-center text-success">{success}</p>}

            <div>
              <label
                htmlFor="currentPassword"
                className="mb-1 block text-sm font-medium text-gray-400"
              >
                Nuværende Adgangskode
              </label>
              <input
                type="password"
                id="currentPassword"
                {...register('currentPassword')}
                className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-error">{errors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-1 block text-sm font-medium text-gray-400"
              >
                Ny Adgangskode
              </label>
              <input
                type="password"
                id="newPassword"
                {...register('newPassword')}
                className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.newPassword && (
                <p className="mt-1 text-sm text-error">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmNewPassword"
                className="mb-1 block text-sm font-medium text-gray-400"
              >
                Bekræft Ny Adgangskode
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                {...register('confirmNewPassword')}
                className="w-full rounded-md border border-dark-border bg-dark-input px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {errors.confirmNewPassword && (
                <p className="mt-1 text-sm text-error">
                  {errors.confirmNewPassword.message}
                </p>
              )}
            </div>

            {newPassword && (
              <div className="rounded-md border border-dark-border bg-dark-surface p-4">
                <h4 className="mb-2 text-base font-semibold text-white">
                  Adgangskode Styrke:{' '}
                  <span
                    className={`${(
                      strength === 'Stærk'
                        ? 'text-success'
                        : strength === 'Medium'
                        ? 'text-warning'
                        : 'text-error'
                    )}`}
                  >
                    {strength}
                  </span>
                </h4>
                <ul className="space-y-1">
                  {requirements.map((req, i) => (
                    <li
                      key={i}
                      className={`text-sm ${
                        req.met ? 'text-success' : 'text-gray-400'
                      }`}
                    >
                      {req.met ? '✅' : '❌'} {req.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-secondary btn-block mt-4 w-full"
            >
              {isSubmitting ? (
                <div className="spinner"></div>
              ) : (
                'Skift Adgangskode'
              )}
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
