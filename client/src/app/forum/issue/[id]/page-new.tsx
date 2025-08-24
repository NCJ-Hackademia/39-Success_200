"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { issuesAPI, commentsAPI, crowdfundingAPI } from "../../../../lib/api";
import type { Issue, Comment, CrowdfundingDetails } from "../../../../types";
import { useUserStore } from "../../../../store/userStore";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Eye,
  MapPin,
  Clock,
  DollarSign,
  Send,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
} from "lucide-react";

export default function IssueDetailPage() {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [crowdfunding, setCrowdfunding] = useState<CrowdfundingDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [showCrowdfundingModal, setShowCrowdfundingModal] = useState(false);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionMessage, setContributionMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const { user } = useUserStore();
  const router = useRouter();
  const params = useParams();
  const issueId = params.id as string;

  const fetchIssueData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch issue details
      const issueResponse = await issuesAPI.getIssueById(issueId);
      setIssue(issueResponse.data);

      // Track view
      await issuesAPI.trackView(issueId);

      // Fetch comments
      const commentsResponse = await commentsAPI.getCommentsByIssue(issueId);
      setComments(commentsResponse.data);

      // Fetch crowdfunding details if enabled
      if (issueResponse.data.crowdfunding?.isEnabled) {
        const crowdfundingResponse =
          await crowdfundingAPI.getCrowdfundingDetails(issueId);
        setCrowdfunding(crowdfundingResponse.data);
      }
    } catch (err: any) {
      console.error("Error fetching issue data:", err);
      setError(err.response?.data?.message || "Failed to load issue details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (issueId) {
      fetchIssueData();
    }
  }, [issueId]);

  const handleUpvoteIssue = async () => {
    if (!issue) return;

    try {
      const response = await issuesAPI.upvoteIssue(issue._id!);
      setIssue({
        ...issue,
        upvotes: response.data.upvotes,
        upvotedBy: response.data.hasUpvoted
          ? [...issue.upvotedBy, user!.id]
          : issue.upvotedBy.filter((id) => id !== user!.id),
      });
    } catch (err) {
      console.error("Error upvoting issue:", err);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      await commentsAPI.createComment(issueId, {
        content: newComment,
        parentComment: replyToComment || undefined,
      });

      // Refresh comments
      const commentsResponse = await commentsAPI.getCommentsByIssue(issueId);
      setComments(commentsResponse.data);

      setNewComment("");
      setReplyToComment(null);
    } catch (err: any) {
      console.error("Error creating comment:", err);
      alert(err.response?.data?.message || "Failed to post comment");
    }
  };

  const handleContribute = async () => {
    if (!contributionAmount || isNaN(Number(contributionAmount))) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      // Generate a mock transaction ID (in real app, this would come from payment gateway)
      const transactionId = `txn_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await crowdfundingAPI.contributeToCrowdfunding(issueId, {
        amount: Number(contributionAmount),
        paymentMethod: "upi", // Mock payment method
        isAnonymous,
        message: contributionMessage,
        transactionId,
      });

      // Refresh crowdfunding data
      const crowdfundingResponse = await crowdfundingAPI.getCrowdfundingDetails(
        issueId
      );
      setCrowdfunding(crowdfundingResponse.data);

      setShowCrowdfundingModal(false);
      setContributionAmount("");
      setContributionMessage("");
      setIsAnonymous(false);

      alert("Contribution successful! Thank you for supporting this issue.");
    } catch (err: any) {
      console.error("Error contributing:", err);
      alert(err.response?.data?.message || "Failed to process contribution");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error || "Issue not found"}</p>
          <button
            onClick={() => router.push("/forum")}
            className="mt-4 px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back to Forum
          </button>
        </div>
      </div>
    );
  }

  const hasUserUpvoted = issue.upvotedBy.includes(user?.id || "");
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-gray-100 text-gray-800";
      case "closed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => router.push("/forum")}
        className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Forum
      </button>

      {/* Issue Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex flex-col lg:flex-row justify-between items-start mb-4">
          <div className="flex-1 mb-4 lg:mb-0">
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                  issue.status
                )}`}
              >
                {issue.status.replace("_", " ").toUpperCase()}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                  issue.priority
                )}`}
              >
                {issue.priority.toUpperCase()}
              </span>
              {issue.crowdfunding?.isEnabled && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  <DollarSign className="h-3 w-3 mr-1" />
                  CROWDFUNDED
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              {issue.title}
            </h1>

            <p className="text-gray-600 mb-4">{issue.description}</p>

            {/* Issue Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {issue.viewsCount || 0} views
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {issue.commentsCount || 0} comments
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(issue.createdAt).toLocaleDateString()}
              </div>
              {issue.location?.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {issue.location.address}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleUpvoteIssue}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                hasUserUpvoted
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${hasUserUpvoted ? "fill-current" : ""}`}
              />
              {issue.upvotes} {hasUserUpvoted ? "Liked" : "Like"}
            </button>

            {issue.crowdfunding?.isEnabled && (
              <button
                onClick={() => setShowCrowdfundingModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <DollarSign className="h-4 w-4" />
                Contribute
              </button>
            )}
          </div>
        </div>

        {/* Crowdfunding Progress */}
        {crowdfunding && (
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-purple-900">
                Crowdfunding Progress
              </h3>
              <span className="text-sm text-purple-700">
                {crowdfunding.daysLeft !== null
                  ? `${crowdfunding.daysLeft} days left`
                  : "No deadline"}
              </span>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>
                  ₹{crowdfunding.crowdfunding.raisedAmount.toLocaleString()}{" "}
                  raised
                </span>
                <span>
                  ₹{crowdfunding.crowdfunding.targetAmount.toLocaleString()}{" "}
                  goal
                </span>
              </div>
              <div className="w-full bg-purple-200 rounded-full h-3">
                <div
                  className="bg-purple-600 h-3 rounded-full"
                  style={{ width: `${crowdfunding.progressPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-purple-600 mt-1">
                <span>{crowdfunding.progressPercentage}% funded</span>
                <span>
                  {crowdfunding.crowdfunding.contributors.length} contributors
                </span>
              </div>
            </div>

            {/* Recent Contributors */}
            {crowdfunding.recentTransactions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-purple-900 mb-2">
                  Recent Contributors
                </h4>
                <div className="space-y-2">
                  {crowdfunding.recentTransactions
                    .slice(0, 3)
                    .map((transaction, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-purple-700">
                          {transaction.isAnonymous
                            ? "Anonymous"
                            : transaction.contributor?.name || "Anonymous"}
                        </span>
                        <span className="font-medium">
                          ₹{transaction.amount}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">
          Discussion ({comments.length})
        </h2>

        {/* Comment Form */}
        <div className="mb-6">
          {replyToComment && (
            <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
              Replying to a comment...
              <button
                onClick={() => setReplyToComment(null)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder={
                replyToComment
                  ? "Write a reply..."
                  : "Share your thoughts or suggestions..."
              }
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSubmitComment()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="mx-auto h-8 w-8 mb-2" />
              <p>No comments yet. Be the first to start the discussion!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment._id}
                className="border-l-2 border-gray-200 pl-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">
                      {typeof comment.author === "object"
                        ? comment.author.name
                        : "User"}
                    </span>
                    {comment.isProviderResponse && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Provider
                      </span>
                    )}
                    {comment.isMarkedAsSolution && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Solution
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                    {comment.isEdited && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 mb-3">{comment.content}</p>

                {/* Provider Response Details */}
                {comment.isProviderResponse &&
                  (comment.estimatedCost || comment.estimatedTime) && (
                    <div className="bg-blue-50 p-3 rounded mb-3">
                      {comment.estimatedCost && (
                        <div className="text-sm">
                          <strong>Estimated Cost:</strong> ₹
                          {comment.estimatedCost}
                        </div>
                      )}
                      {comment.estimatedTime && (
                        <div className="text-sm">
                          <strong>Estimated Time:</strong>{" "}
                          {comment.estimatedTime}
                        </div>
                      )}
                    </div>
                  )}

                {/* Comment Actions */}
                <div className="flex items-center gap-4 text-sm">
                  <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600">
                    <ThumbsUp className="h-3 w-3" />
                    {comment.upvotes || 0}
                  </button>
                  <button className="flex items-center gap-1 text-gray-600 hover:text-red-600">
                    <ThumbsDown className="h-3 w-3" />
                    {comment.downvotes || 0}
                  </button>
                  <button
                    onClick={() => setReplyToComment(comment._id!)}
                    className="text-gray-600 hover:text-blue-600"
                  >
                    Reply
                  </button>
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 ml-4 space-y-3">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply._id}
                        className="border-l-2 border-gray-100 pl-3"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {typeof reply.author === "object"
                              ? reply.author.name
                              : "User"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(reply.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Crowdfunding Modal */}
      {showCrowdfundingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Contribute to this Issue
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="Enter amount"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Message (optional)
                </label>
                <input
                  type="text"
                  placeholder="Add a message with your contribution"
                  value={contributionMessage}
                  onChange={(e) => setContributionMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <label htmlFor="anonymous" className="text-sm">
                  Contribute anonymously
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCrowdfundingModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleContribute}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Contribute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
