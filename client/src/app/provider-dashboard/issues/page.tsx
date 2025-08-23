"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { ProtectedRoute } from "../../../components/ProtectedRoute";
import api from "../../../lib/api";
import {
  AlertCircle,
  Clock,
  Loader2,
  MapPin,
  Calendar,
  CheckCircle,
  ArrowLeft,
  User,
  Tag,
} from "lucide-react";

interface Issue {
  _id: string;
  title: string;
  description: string;
  status: "open" | "assigned" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  location: {
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  consumer: {
    _id: string;
    name: string;
    email: string;
  };
  assignedProvider?: {
    _id: string;
    name: string;
    email: string;
  };
  category: {
    _id: string;
    name: string;
    description: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ProviderIssuesPage() {
  const router = useRouter();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingIssue, setUpdatingIssue] = useState<string | null>(null);

  const fetchProviderIssues = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all available issues for providers (unassigned issues)
      const response = await api.get("/api/issues", {
        params: {
          status: "open,assigned", // Get both open and assigned issues
          limit: 50,
        },
      });

      if (response.data.success) {
        setIssues(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching provider issues:", err);
      setError(err.response?.data?.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptIssue = async (issueId: string) => {
    try {
      setUpdatingIssue(issueId);

      const response = await api.patch(`/api/issues/${issueId}`, {
        status: "assigned",
        assignedProvider: "current_user_id", // This should be handled by the backend
      });

      if (response.data.success) {
        // Refresh the issues list
        await fetchProviderIssues();
      }
    } catch (err: any) {
      console.error("Error accepting issue:", err);
      alert(err.response?.data?.message || "Failed to accept issue");
    } finally {
      setUpdatingIssue(null);
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    try {
      setUpdatingIssue(issueId);

      const response = await api.patch(`/api/issues/${issueId}`, {
        status: "resolved",
      });

      if (response.data.success) {
        // Refresh the issues list
        await fetchProviderIssues();
      }
    } catch (err: any) {
      console.error("Error resolving issue:", err);
      alert(err.response?.data?.message || "Failed to resolve issue");
    } finally {
      setUpdatingIssue(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600 bg-red-100";
      case "high":
        return "text-orange-600 bg-orange-100";
      case "medium":
        return "text-yellow-600 bg-yellow-100";
      case "low":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "text-blue-600 bg-blue-100";
      case "assigned":
        return "text-purple-600 bg-purple-100";
      case "in_progress":
        return "text-orange-600 bg-orange-100";
      case "resolved":
        return "text-green-600 bg-green-100";
      case "closed":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  useEffect(() => {
    fetchProviderIssues();
  }, []);

  if (loading) {
    return (
      <ProtectedRoute requiredRole="provider" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="text-gray-600 dark:text-gray-300">
              Loading issues...
            </span>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole="provider" fallbackPath="/login">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">{error}</p>
              <button
                onClick={fetchProviderIssues}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole="provider" fallbackPath="/login">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/provider-dashboard")}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                    <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
                    Available Issues
                  </h1>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    Issues available for you to handle
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          {issues.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent className="">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Issues Available
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  There are currently no issues available for you to handle.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {issues.map((issue) => (
                <Card
                  key={issue._id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader className="">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                          {issue.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {issue.description}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            issue.priority
                          )}`}
                        >
                          {issue.priority.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            issue.status
                          )}`}
                        >
                          {issue.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{issue.consumer.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {issue.location.address}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Tag className="h-4 w-4" />
                        <span>{issue.category.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(issue.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      {issue.status === "open" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleAcceptIssue(issue._id)}
                          disabled={updatingIssue === issue._id}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {updatingIssue === issue._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Accepting...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept Issue
                            </>
                          )}
                        </Button>
                      )}

                      {(issue.status === "assigned" ||
                        issue.status === "in_progress") && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleResolveIssue(issue._id)}
                          disabled={updatingIssue === issue._id}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {updatingIssue === issue._id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Resolving...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
