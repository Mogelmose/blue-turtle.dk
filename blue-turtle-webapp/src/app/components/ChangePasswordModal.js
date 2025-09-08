"use client";

import { useState, useEffect } from "react";
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
  const requirements = [
    { label: "At least 12 characters", met: newPassword.length >= 12 },
    { label: "At least 1 uppercase (A-Z)", met: /[A-Z]/.test(newPassword) },
    { label: "At least 1 lowercase (a-z)", met: /[a-z]/.test(newPassword) },
    { label: "At least 1 number (0-9)", met: /[0-9]/.test(newPassword) },
    {
      label: "At least 1 special character",
      met: /[^A-Za-z0-9]/.test(newPassword),
    },
  ];

  // Calculate password strength
  useEffect(() => {
    const metCount = requirements.filter((r) => r.met).length;
    const newStrength =
      metCount < 3 ? "Weak" : metCount < 5 ? "Medium" : "Strong";
    setStrength(newStrength);
  }, [newPassword]);

  const onSubmit = async (data) => {
    setServerError("");
    setSuccess("");

    try {
      const response = await fetch("/api/change-password", {
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
          <h2>Change Password</h2>
          
          {serverError && <p className="error-message">{serverError}</p>}
          }
          {success && <p className="success-message">{success}</p>}
          }

          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              {...register("currentPassword")}
              disabled={isSubmitting}
            />
            {errors.currentPassword && (
              <p className="error-message">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              {...register("newPassword")}
              disabled={isSubmitting}
            />
            {errors.newPassword && (
              <p className="error-message">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmNewPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmNewPassword"
              {...register("confirmNewPassword")}
              disabled={isSubmitting}
            />
            {errors.confirmNewPassword && (
              <p className="error-message">{errors.confirmNewPassword.message}</p>
            )}
          </div>

          {/* Password strength indicator */}
          {newPassword && (
            <div className="password-strength">
              <h4>
                Password Strength:{" "}
                <span
                  style={{
                    color:
                      strength === "Strong"
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
            disabled={isSubmitting}
          >
            {isSubmitting ? <div className="spinner"></div> : "Change Password"}
            }
          </button>
        </form>
      </div>
    </div>
  );
}