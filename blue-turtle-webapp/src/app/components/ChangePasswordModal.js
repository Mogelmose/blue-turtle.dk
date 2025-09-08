"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema } from "@/lib/passwordSchema";
import "../css/modal.css";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [strength, setStrength] = useState("Weak");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  // Watch new password for real-time validation
  const newPassword = watch("newPassword", "");

  // Password requirements checklist
  const requirements = useMemo(() => [
    { label: "Minimum 12 karakterer", met: newPassword.length >= 12 },
    { label: "Mindst 1 stort bogstav (A-Z)", met: /[A-Z]/.test(newPassword) },
    { label: "Mindst 1 lille bogstav (a-z)", met: /[a-z]/.test(newPassword) },
    { label: "Mindst 1 tal (0-9)", met: /[0-9]/.test(newPassword) },
    { label: "Mindst 1 specialtegn", met: /[^A-Za-z0-9]/.test(newPassword) },
  ], [newPassword]);

  // Calculate password strength
  useEffect(() => {
    const metCount = requirements.filter((r) => r.met).length;
    const newStrength =
      metCount < 3 ? "Svag" : metCount < 5 ? "Medium" : "Stærk";
    setStrength(newStrength);
  }, [requirements]);

  const onSubmit = async (data) => {
    setServerError("");
    setSuccess("");

    try {
  const response = await fetch("/api/password-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess("Password updated successfully!");
        setTimeout(() => {
          reset();
          setSuccess("");
          setServerError("");
          onClose();
        }, 2000);
      } else {
        setServerError(result.error || "Something went wrong");
      }
    } catch (error) {
      setServerError("Network error. Please try again.");
      console.error("Password change error:", error);
    }
  };

  const handleClose = () => {
    reset();
    setServerError("");
    setSuccess("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <button onClick={handleClose} className="modal-close-btn">
          &times;
        </button>
        <form onSubmit={handleSubmit(onSubmit)} className="album-form">
          <fieldset disabled={isSubmitting} style={{ border: 0, padding: 0, margin: 0 }}>
            <h2>Skift din Adgangskode</h2>
            {serverError && <p className="error-message">{serverError}</p>}
            {success && <p className="success-message">{success}</p>}

            <div className="form-group">
              <label htmlFor="currentPassword">Nuværende Adgangskode</label>
              <input
                type="password"
                id="currentPassword"
                className="input-large"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="error-message">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">Ny Adgangskode</label>
              <input
                type="password"
                id="newPassword"
                className="input-large"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="error-message">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmNewPassword">Bekræft Ny Adgangskode</label>
              <input
                type="password"
                id="confirmNewPassword"
                className="input-large"
                {...register("confirmNewPassword")}
              />
              {errors.confirmNewPassword && (
                <p className="error-message">{errors.confirmNewPassword.message}</p>
              )}
            </div>

            {newPassword && (
              <div className="password-strength">
                <h4>
                  Adgangskode Styrke:{" "}
                  <span
                    style={{
                      color:
                        strength === "Stærk"
                          ? "green"
                          : strength === "Medium"
                          ? "orange"
                          : "red",
                    }}
                  >
                    {strength}
                  </span>
                </h4>
                <ul className="requirements-list">
                  {requirements.map((req, i) => (
                    <li
                      key={i}
                      style={{
                        color: req.met ? "green" : "#ccc",
                        fontSize: "14px",
                        marginBottom: "4px",
                      }}
                    >
                      {req.met ? "✅" : "❌"} {req.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-secondary btn-block"
              style={{ marginTop: "20px" }}
            >
              {isSubmitting ? <div className="spinner"></div> : "Skift Adgangskode"}
            </button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}