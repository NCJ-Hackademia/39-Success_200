"use client";

import React, { useState, useEffect } from "react";
import { dashboardAPI } from "../../../lib/api";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useUserStore } from "../../../store/userStore";

const ConsumerBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useUserStore();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getBookings();
      setBookings(response.data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      setError("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      in_progress: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusColors[status] || statusColors.pending
        }`}
      >
        {status?.replace("_", " ").toUpperCase() || "PENDING"}
      </span>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <Button
          onClick={fetchBookings}
          variant="outline"
          size="default"
          className=""
        >
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="p-6 mb-6">
          <div className="text-center text-red-600">
            <p>{error}</p>
            <Button
              onClick={fetchBookings}
              variant="outline"
              size="default"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {bookings.length === 0 ? (
        <Card className="p-6">
          <div className="text-center text-gray-600">
            <p className="text-lg mb-4">You don't have any bookings yet.</p>
            <p>
              Start by finding services or reporting issues that need
              professional help.
            </p>
            <div className="mt-6 space-x-4">
              <Button
                onClick={() => (window.location.href = "/services")}
                variant="default"
                size="default"
                className=""
              >
                Find Services
              </Button>
              <Button
                onClick={() => (window.location.href = "/issues")}
                variant="outline"
                size="default"
                className=""
              >
                Report Issue
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id || booking._id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    {booking.title}
                  </h3>
                  <p className="text-gray-600 mb-3">{booking.description}</p>
                </div>
                <div className="ml-4">{getStatusBadge(booking.status)}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-medium">
                    {booking.provider?.name || "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{booking.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scheduled Date</p>
                  <p className="font-medium">
                    {booking.scheduledDate
                      ? formatDate(booking.scheduledDate)
                      : "Not scheduled"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Cost</p>
                  <p className="font-medium">
                    ₹{booking.estimatedCost?.toLocaleString() || "TBD"}
                  </p>
                </div>
                {booking.finalCost && (
                  <div>
                    <p className="text-sm text-gray-500">Final Cost</p>
                    <p className="font-medium">
                      ₹{booking.finalCost.toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <p className="font-medium">
                    {booking.paymentStatus || "Pending"}
                  </p>
                </div>
              </div>

              {booking.location && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{booking.location.address}</p>
                </div>
              )}

              {booking.providerNotes && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">Provider Notes</p>
                  <p className="font-medium">{booking.providerNotes}</p>
                </div>
              )}

              <div className="flex justify-between items-center text-sm text-gray-500 pt-4 border-t">
                <span>Booked on {formatDate(booking.createdAt)}</span>
                {booking.updatedAt !== booking.createdAt && (
                  <span>Updated on {formatDate(booking.updatedAt)}</span>
                )}
              </div>

              {booking.status === "completed" && !booking.rating && (
                <div className="mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" className="">
                    Rate Service
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConsumerBookings;
