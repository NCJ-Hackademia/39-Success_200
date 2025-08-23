"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useUserActions } from "../../store/userStore";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wrench,
  Shield,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useUserActions();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    userType: "user", // "admin" or "user"
    role: "consumer", // "consumer" or "provider" (only for user type)
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation (optional but if provided, should be valid)
    if (formData.phone && !/^\+?[\d\s-()]{10,}$/.test(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // User type validation
    if (!formData.userType || !["admin", "user"].includes(formData.userType)) {
      newErrors.userType = "Please select a valid user type";
    }

    // Role validation (only for user type)
    if (formData.userType === "user") {
      if (!formData.role || !["consumer", "provider"].includes(formData.role)) {
        newErrors.role = "Please select a valid role";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear specific field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call for registration
      // Replace this with actual API call to your backend
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          phone: formData.phone.trim(),
          password: formData.password,
          role: formData.userType === "admin" ? "admin" : formData.role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();

      // Store user data and token
      setAuth(data.user, data.token);

      // Redirect based on role
      let redirectPath = "/dashboard"; // default for consumer
      if (data.user.role === "provider") {
        redirectPath = "/provider-dashboard";
      } else if (data.user.role === "admin") {
        redirectPath = "/admin-dashboard";
      }
      router.push(redirectPath);
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({
        general:
          error instanceof Error
            ? error.message
            : "Registration failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Join HACKADEMIA
            </CardTitle>
            <CardDescription className="text-center">
              Create your account to start reporting issues and booking services
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* General Error */}
              {errors.general && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{errors.general}</span>
                </div>
              )}

              {/* Name Field */}
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={`pl-10 ${
                      errors.name ? "border-red-500 focus:border-red-500" : ""
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.name}</span>
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`pl-10 ${
                      errors.email ? "border-red-500 focus:border-red-500" : ""
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`pl-10 ${
                      errors.phone ? "border-red-500 focus:border-red-500" : ""
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.phone}</span>
                  </p>
                )}
              </div>

              {/* User Type Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Account Type *
                </label>

                {/* Step 1: Admin or User */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange("userType", "admin");
                      // Clear role when switching to admin
                      handleInputChange("role", "");
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.userType === "admin"
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    disabled={isLoading}
                  >
                    <div className="text-center">
                      <Shield className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-medium">Admin</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Manage platform & users
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange("userType", "user");
                      // Set default role when switching to user
                      if (!formData.role || formData.role === "") {
                        handleInputChange("role", "consumer");
                      }
                    }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.userType === "user"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                    disabled={isLoading}
                  >
                    <div className="text-center">
                      <User className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-medium">User</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Citizen or service provider
                      </div>
                    </div>
                  </button>
                </div>

                {/* Step 2: Consumer or Provider (only shown for User type) */}
                {formData.userType === "user" && (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      User Role *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleInputChange("role", "consumer")}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.role === "consumer"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        disabled={isLoading}
                      >
                        <div className="text-center">
                          <User className="w-5 h-5 mx-auto mb-1" />
                          <div className="font-medium text-sm">Consumer</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Report issues & book services
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInputChange("role", "provider")}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.role === "provider"
                            ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        disabled={isLoading}
                      >
                        <div className="text-center">
                          <Wrench className="w-5 h-5 mx-auto mb-1" />
                          <div className="font-medium text-sm">Provider</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Offer services to citizens
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Error messages */}
                {errors.userType && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.userType}</span>
                  </p>
                )}
                {errors.role && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.role}</span>
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    className={`pl-10 pr-10 ${
                      errors.password
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.password}</span>
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    className={`pl-10 pr-10 ${
                      errors.confirmPassword
                        ? "border-red-500 focus:border-red-500"
                        : ""
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center space-x-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>{errors.confirmPassword}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Create Account
                  </>
                )}
              </Button>

              {/* Login Link */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Terms and Privacy */}
        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          By creating an account, you agree to our{" "}
          <Link
            href="/terms"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
